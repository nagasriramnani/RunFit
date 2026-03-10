-- Complete Game Mechanics Implementation for DAUDLO
-- 1. Run Validation
-- 2. Territory Capture (Polygon closure)
-- 3. Enemy Territory intersection mapping (cutting off overlapping mesh)
-- 4. Profile stats updating (city rankings, stats, streaks)

CREATE OR REPLACE FUNCTION validate_run_integrity(p_run_id UUID) 
RETURNS JSON AS $$
DECLARE
  v_pts_count INT;
  v_run RECORD;
BEGIN
  -- Simple validation logic
  SELECT COUNT(*) INTO v_pts_count FROM run_points WHERE run_id = p_run_id;
  
  IF v_pts_count < 3 THEN
    RETURN json_build_object('is_valid', false, 'reason', 'Not enough points (minimum 3 required to form a zone).');
  END IF;

  RETURN json_build_object('is_valid', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION process_run_territory(p_run_id UUID, p_user_id UUID) 
RETURNS JSON AS $$
DECLARE
  v_points_count INT;
  v_run_distance FLOAT;
  v_polygon GEOMETRY(Polygon, 4326);
  v_multipolygon GEOMETRY(MultiPolygon, 4326);
  v_area_sqm FLOAT;
  v_new_territory_id UUID;
  v_existing_overlap RECORD;
BEGIN
  -- 1. Grab point counts and run distance
  SELECT COUNT(*) INTO v_points_count FROM run_points WHERE run_id = p_run_id;
  SELECT COALESCE(distance_km, 0) INTO v_run_distance FROM runs WHERE id = p_run_id;

  IF v_points_count < 3 THEN
    RETURN json_build_object('success', false, 'reason', 'Insufficient points to form territory.');
  END IF;

  -- 2. Construct the Polygon
  -- We take all points ordered by timestamp, make a linestring, and close it back to the start
  BEGIN
    SELECT ST_MakePolygon(
            ST_AddPoint(
                ST_MakeLine(geom ORDER BY timestamp), 
                (SELECT geom FROM run_points WHERE run_id = p_run_id ORDER BY timestamp ASC LIMIT 1)
            )
           ) 
    INTO v_polygon
    FROM run_points 
    WHERE run_id = p_run_id;

    -- Ensure it's valid
    IF NOT ST_IsValid(v_polygon) THEN
      v_polygon := ST_MakeValid(v_polygon)::GEOMETRY(Polygon, 4326);
    END IF;

    -- Wrap it in MultiPolygon format
    v_multipolygon := ST_Multi(v_polygon);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'reason', 'Failed to form a valid geometric shape natively.', 'error', SQLERRM);
  END;

  -- Calculate true area
  v_area_sqm := ST_Area(v_multipolygon::geography);

  IF v_area_sqm < 10 THEN
    RETURN json_build_object('success', false, 'reason', 'Area too small to claim (less than 10 sqm).');
  END IF;

  -- 3. Cut off any intersecting enemy territories (Spatial subtraction)
  FOR v_existing_overlap IN 
      SELECT id, owner_id, geom 
      FROM territories 
      WHERE ST_Intersects(geom, v_multipolygon) 
      AND owner_id != p_user_id
  LOOP
      -- Calculate the difference (their territory minus our new territory)
      UPDATE territories 
      SET geom = ST_Multi(ST_Difference(geom, v_multipolygon))
      WHERE id = v_existing_overlap.id;
      
      -- If their territory was completely absorbed (area becomes 0 or empty geometry), delete it
      DELETE FROM territories WHERE ST_IsEmpty(geom);

      -- We would optionally log a 'territory_event' here for notifications
      INSERT INTO territory_events (territory_id, attacker_id, defender_id, event_type, damage_amount)
      VALUES (v_existing_overlap.id, p_user_id, v_existing_overlap.owner_id, 'capture_overlap', 100);
  END LOOP;

  -- 4. Save the newly captured territory
  INSERT INTO territories (owner_id, geom, health)
  VALUES (p_user_id, v_multipolygon, 100.0)
  RETURNING id INTO v_new_territory_id;

  -- 5. Update Profile Stats
  UPDATE profiles 
  SET 
    total_km = total_km + v_run_distance,
    zones_owned = zones_owned + 1,
    streak = streak + 1, -- Naive streak bump 
    last_active_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true, 
    'territory_id', v_new_territory_id,
    'captured_area_sqm', v_area_sqm
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
