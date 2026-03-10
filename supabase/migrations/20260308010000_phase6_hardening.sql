-- Phase 6: Final Hardening

-- Drop existing stubs to avoid parameter name conflict errors
DROP FUNCTION IF EXISTS validate_run_integrity(UUID);
DROP FUNCTION IF EXISTS process_run_territory(UUID, UUID);

-- 1. Anti-cheat validation logic
CREATE OR REPLACE FUNCTION validate_run_integrity(p_run_id UUID) 
RETURNS JSON AS $$
DECLARE
  v_pts_count INT;
  v_filtered_count INT := 0;
  v_mocked_count INT := 0;
  v_suspicious_count INT := 0;
  v_duration FLOAT := 0;
  v_distance FLOAT := 0;
  v_max_speed FLOAT := 0;
  v_start_time TIMESTAMP WITH TIME ZONE;
  v_end_time TIMESTAMP WITH TIME ZONE;
  
  v_prev_geom GEOMETRY;
  v_prev_ts TIMESTAMP WITH TIME ZONE;
  pt RECORD;
  v_segment_dist FLOAT;
  v_segment_time FLOAT;
  v_segment_speed FLOAT;
BEGIN
  -- 1. Initial counts
  SELECT count(*), 
         COALESCE(SUM(CASE WHEN is_mocked THEN 1 ELSE 0 END), 0),
         MIN(timestamp),
         MAX(timestamp)
  INTO v_pts_count, v_mocked_count, v_start_time, v_end_time
  FROM run_points
  WHERE run_id = p_run_id;

  IF v_pts_count < 10 THEN
    RETURN json_build_object('is_valid', false, 'reason', 'Too few points (' || v_pts_count || ')', 'point_count', v_pts_count, 'filtered_point_count', 0, 'duration_seconds', 0, 'distance_m', 0, 'max_speed_mps', 0, 'suspicious_segment_count', 0);
  END IF;

  IF v_mocked_count > 0 THEN
    RETURN json_build_object('is_valid', false, 'reason', 'Mocked location detected', 'point_count', v_pts_count, 'filtered_point_count', 0, 'duration_seconds', 0, 'distance_m', 0, 'max_speed_mps', 0, 'suspicious_segment_count', 0);
  END IF;

  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time));

  -- 2. Process points iteratively to filter outliers and calculate precise distance
  v_prev_geom := NULL;
  v_prev_ts := NULL;

  FOR pt IN 
    SELECT geom, timestamp, accuracy 
    FROM run_points 
    WHERE run_id = p_run_id 
    ORDER BY timestamp ASC
  LOOP
    -- Accuracy filter: skip very inaccurate points (e.g. > 50m)
    IF pt.accuracy > 50 THEN
      CONTINUE;
    END IF;
    
    -- Exclude backwards or duplicate timestamps
    IF v_prev_ts IS NOT NULL AND pt.timestamp <= v_prev_ts THEN
      CONTINUE; 
    END IF;

    v_filtered_count := v_filtered_count + 1;

    IF v_prev_geom IS NOT NULL THEN
      v_segment_dist := ST_Distance(pt.geom::geography, v_prev_geom::geography);
      v_segment_time := EXTRACT(EPOCH FROM (pt.timestamp - v_prev_ts));
      
      IF v_segment_time > 0 THEN
        v_segment_speed := v_segment_dist / v_segment_time;
      ELSE
        v_segment_speed := 0;
      END IF;

      IF v_segment_speed > v_max_speed THEN
        v_max_speed := v_segment_speed;
      END IF;

      v_distance := v_distance + v_segment_dist;

      -- Sustained spike detection (> 12 m/s which is ~43 km/h highly suspicious for runner)
      IF v_segment_speed > 12.0 THEN
        v_suspicious_count := v_suspicious_count + 1;
      END IF;
    END IF;

    v_prev_geom := pt.geom;
    v_prev_ts := pt.timestamp;
  END LOOP;

  -- 3. Final evaluations on filtered data
  IF v_filtered_count < 10 THEN
    RETURN json_build_object('is_valid', false, 'reason', 'Too few valid points after filtering (' || v_filtered_count || ')', 'point_count', v_pts_count, 'filtered_point_count', v_filtered_count, 'duration_seconds', v_duration, 'distance_m', ROUND(v_distance::numeric, 2), 'max_speed_mps', ROUND(v_max_speed::numeric, 2), 'suspicious_segment_count', v_suspicious_count);
  END IF;

  IF v_duration < 60 THEN
    RETURN json_build_object('is_valid', false, 'reason', 'Run duration too short (' || ROUND(v_duration::numeric, 1) || 's)', 'point_count', v_pts_count, 'filtered_point_count', v_filtered_count, 'duration_seconds', v_duration, 'distance_m', ROUND(v_distance::numeric, 2), 'max_speed_mps', ROUND(v_max_speed::numeric, 2), 'suspicious_segment_count', v_suspicious_count);
  END IF;

  IF v_distance < 100 THEN
    RETURN json_build_object('is_valid', false, 'reason', 'Run distance too short (' || ROUND(v_distance::numeric, 1) || 'm)', 'point_count', v_pts_count, 'filtered_point_count', v_filtered_count, 'duration_seconds', v_duration, 'distance_m', ROUND(v_distance::numeric, 2), 'max_speed_mps', ROUND(v_max_speed::numeric, 2), 'suspicious_segment_count', v_suspicious_count);
  END IF;

  -- If more than 3 suspicious segments, rule it out as vehicle/teleporting
  IF v_suspicious_count > 3 THEN
     RETURN json_build_object('is_valid', false, 'reason', 'Sustained unrealistic speed segments (' || v_suspicious_count || ')', 'point_count', v_pts_count, 'filtered_point_count', v_filtered_count, 'duration_seconds', v_duration, 'distance_m', ROUND(v_distance::numeric, 2), 'max_speed_mps', ROUND(v_max_speed::numeric, 2), 'suspicious_segment_count', v_suspicious_count);
  END IF;

  RETURN json_build_object(
    'is_valid', true, 
    'reason', null, 
    'point_count', v_pts_count, 
    'filtered_point_count', v_filtered_count, 
    'duration_seconds', v_duration, 
    'distance_m', ROUND(v_distance::numeric, 2), 
    'max_speed_mps', ROUND(v_max_speed::numeric, 2), 
    'suspicious_segment_count', v_suspicious_count
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Territory Processing Engine
CREATE OR REPLACE FUNCTION process_run_territory(p_run_id UUID, p_user_id UUID) 
RETURNS JSON AS $$
DECLARE
  v_run_poly GEOMETRY;
  v_enemy RECORD;
  v_friendly RECORD;
  v_intersection GEOMETRY;
  v_difference GEOMETRY;
  v_damage FLOAT;
  v_rem_area FLOAT;
  v_total_area FLOAT;
  v_unclaimed GEOMETRY;
  v_events_inserted INT := 0;
  v_new_zones_inserted INT := 0;
  v_run_distance FLOAT;
  v_new_zone_id UUID;
BEGIN
  -- 1. Create the buffered run polygon: ST_Buffer with 25m radius
  -- Build the line from true geometry ordered by time, then cast to geography for meters buffering, then cast back to geometry
  SELECT ST_Multi(ST_MakeValid(ST_Buffer(ST_MakeLine(geom ORDER BY timestamp)::geography, 25, 'join=round endcap=round')::geometry))
  INTO v_run_poly
  FROM run_points 
  WHERE run_id = p_run_id AND user_id = p_user_id AND accuracy <= 50;

  IF v_run_poly IS NULL OR ST_IsEmpty(v_run_poly) THEN
    RETURN json_build_object('success', false, 'reason', 'No valid geometry generated.');
  END IF;

  v_unclaimed := v_run_poly;

  -- 2. Process Enemy Territories (using table locking to prevent race conditions)
  FOR v_enemy IN
    SELECT id, owner_id, geom, health 
    FROM territories 
    WHERE ST_Intersects(geom, v_run_poly) AND owner_id != p_user_id
    FOR UPDATE
  LOOP
    v_intersection := ST_Intersection(v_enemy.geom, v_run_poly);
    v_total_area := ST_Area(v_enemy.geom::geography);
    
    IF v_total_area > 0 THEN
      -- Base damage formula: percentage overlap * 200
      v_damage := (ST_Area(v_intersection::geography) / v_total_area) * 200.0;
      
      IF v_enemy.health - v_damage <= 0 THEN
        -- Enemy territory defeated: partial capture slice
        v_difference := ST_CollectionExtract(ST_Difference(v_enemy.geom, v_run_poly), 3);
        
        IF ST_IsEmpty(v_difference) THEN
          v_rem_area := 0;
        ELSE
          v_difference := ST_Multi(ST_MakeValid(v_difference));
          v_rem_area := ST_Area(v_difference::geography);
        END IF;
        
        IF v_rem_area < 100 THEN
            INSERT INTO territory_events (territory_id, attacker_id, defender_id, event_type, damage_amount)
            VALUES (v_enemy.id, p_user_id, v_enemy.owner_id, 'ruin', v_damage);
            
            -- Destroy completely (event's territory_id becomes NULL automatically via ON DELETE SET NULL constraint)
            DELETE FROM territories WHERE id = v_enemy.id;
        ELSE
            -- Slice it and set health to 50
            UPDATE territories 
            SET geom = v_difference, health = 50.0, updated_at = NOW()
            WHERE id = v_enemy.id;
            
            INSERT INTO territory_events (territory_id, attacker_id, defender_id, event_type, damage_amount)
            VALUES (v_enemy.id, p_user_id, v_enemy.owner_id, 'damage_slice', v_damage);
            
            -- Remove the remaining enemy geometry from the unclaimed pool
            v_unclaimed := ST_Multi(ST_MakeValid(ST_CollectionExtract(ST_Difference(v_unclaimed, v_difference), 3)));
        END IF;

      ELSE
        -- Just damage it
        UPDATE territories 
        SET health = health - v_damage, updated_at = NOW()
        WHERE id = v_enemy.id;
        
        INSERT INTO territory_events (territory_id, attacker_id, defender_id, event_type, damage_amount)
        VALUES (v_enemy.id, p_user_id, v_enemy.owner_id, 'damage', v_damage);
        
        -- Since it's not defeated, the enemy keeps it. Subtract from our unclaimed pool.
        v_unclaimed := ST_Multi(ST_MakeValid(ST_CollectionExtract(ST_Difference(v_unclaimed, v_enemy.geom), 3)));
      END IF;
    END IF;
  END LOOP;

  -- 3. Process Friendly Territories
  FOR v_friendly IN
    SELECT id, geom, health 
    FROM territories 
    WHERE ST_Intersects(geom, v_run_poly) AND owner_id = p_user_id
    FOR UPDATE
  LOOP
    -- Fortify
    UPDATE territories 
    SET health = LEAST(100.0, health + 15.0), last_defended_at = NOW(), updated_at = NOW()
    WHERE id = v_friendly.id;
    
    INSERT INTO territory_events (territory_id, attacker_id, defender_id, event_type, damage_amount)
    VALUES (v_friendly.id, NULL, p_user_id, 'fortify', 0);
    
    -- Subtract from unclaimed so we don't create duplicate overlapping territories
    v_unclaimed := ST_Multi(ST_MakeValid(ST_CollectionExtract(ST_Difference(v_unclaimed, v_friendly.geom), 3)));
  END LOOP;

  -- 4. Claim remaining free land
  IF v_unclaimed IS NOT NULL AND ST_Area(v_unclaimed::geography) > 50 THEN
    v_unclaimed := ST_Multi(ST_MakeValid(ST_CollectionExtract(v_unclaimed, 3)));
    
    IF NOT ST_IsEmpty(v_unclaimed) THEN
        INSERT INTO territories (owner_id, geom, health, captured_at, last_defended_at)
        VALUES (p_user_id, v_unclaimed, 100.0, NOW(), NOW())
        RETURNING id INTO v_new_zone_id;
        
        v_new_zones_inserted := 1;
        
        INSERT INTO territory_events (territory_id, attacker_id, defender_id, event_type, damage_amount)
        VALUES (v_new_zone_id, p_user_id, NULL, 'capture', 0);
    END IF;
  END IF;

  -- 5. Update global stats for the user
  SELECT distance_km INTO v_run_distance FROM runs WHERE id = p_run_id;

  UPDATE profiles 
  SET total_km = total_km + COALESCE(v_run_distance, 0),
      zones_owned = (SELECT count(*) FROM territories WHERE owner_id = p_user_id),
      last_active_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
      'success', true, 
      'captured_area_sqm', ROUND(ST_Area(v_unclaimed::geography)::numeric, 2), 
      'zones_created', v_new_zones_inserted
  );
END;
$$ LANGUAGE plpgsql;
