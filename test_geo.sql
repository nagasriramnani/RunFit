-- test_geo.sql : SQL Test Script for Geometries and Anti-Cheat
-- You can run this file in your Supabase project by executing:
-- Get-Content test_geo.sql | npx supabase db query

DO $$
DECLARE
  v_user_1 UUID := gen_random_uuid();
  v_user_2 UUID := gen_random_uuid();
  v_run_enemy UUID := gen_random_uuid();
  v_run_attack UUID := gen_random_uuid();
  v_run_fortify UUID := gen_random_uuid();
  v_run_low_acc UUID := gen_random_uuid();
  v_run_dup_ts UUID := gen_random_uuid();
  
  v_res JSON;
  v_base_time TIMESTAMP WITH TIME ZONE := NOW();
  v_affected_rows INT;
BEGIN
  -- 1. Setup Mock Users
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES 
  (v_user_1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_user_1 || '@daudlo.com'),
  (v_user_2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_user_2 || '@daudlo.com');

  RAISE NOTICE '--- RUNNING TESTS ---';

  -- 2. Setup Enemy Run (User 1) - Valid Straight Line
  INSERT INTO runs (id, user_id, status) VALUES (v_run_enemy, v_user_1, 'active');
  
  -- Insert 15 valid points spaced 10 seconds and ~50 meters apart (~5 m/s)
  FOR i IN 1..15 LOOP
    INSERT INTO run_points (run_id, user_id, geom, accuracy, timestamp)
    VALUES (
      v_run_enemy, v_user_1, 
      ST_SetSRID(ST_MakePoint(0 + (i * 0.00045), 0), 4326), 
      5.0, 
      v_base_time + (i * INTERVAL '10 seconds')
    );
  END LOOP;

  SELECT validate_run_integrity(v_run_enemy) INTO v_res;
  RAISE NOTICE '1. User 1 Straight Line Validation: %', v_res;
  
  SELECT process_run_territory(v_run_enemy, v_user_1) INTO v_res;
  RAISE NOTICE '2. User 1 Territory Creation: %', v_res;

  -- 3. Friendly Fortify (User 1 overlaps their own zone)
  INSERT INTO runs (id, user_id, status) VALUES (v_run_fortify, v_user_1, 'active');
  FOR i IN 1..15 LOOP
    INSERT INTO run_points (run_id, user_id, geom, accuracy, timestamp)
    VALUES (
      v_run_fortify, v_user_1, 
      ST_SetSRID(ST_MakePoint(0 + (i * 0.00045), 0.00010), 4326), 
      5.0, 
      v_base_time + (i * INTERVAL '10 seconds')
    );
  END LOOP;
  SELECT process_run_territory(v_run_fortify, v_user_1) INTO v_res;
  RAISE NOTICE '3. User 1 Fortify Overlap: %', v_res;


  -- 4. Setup Partial Capture Attack (User 2)
  -- User 2 runs exactly perpendicular, crossing User 1's track
  INSERT INTO runs (id, user_id, status) VALUES (v_run_attack, v_user_2, 'active');
  FOR i IN 1..15 LOOP
    INSERT INTO run_points (run_id, user_id, geom, accuracy, timestamp)
    VALUES (
      v_run_attack, v_user_2, 
      ST_SetSRID(ST_MakePoint(0.002, -0.003 + (i * 0.00045)), 4326), 
      5.0, 
      v_base_time + (i * INTERVAL '10 seconds')
    );
  END LOOP;

  SELECT process_run_territory(v_run_attack, v_user_2) INTO v_res;
  RAISE NOTICE '4. User 2 Partial Capture Attack: %', v_res;

  -- 5. Setup Low-Accuracy Run
  INSERT INTO runs (id, user_id, status) VALUES (v_run_low_acc, v_user_2, 'active');
  FOR i IN 1..15 LOOP
    INSERT INTO run_points (run_id, user_id, geom, accuracy, timestamp)
    VALUES (
      v_run_low_acc, v_user_2, 
      ST_SetSRID(ST_MakePoint(0, 0), 4326), 
      CASE WHEN i <= 10 THEN 100.0 ELSE 5.0 END, -- 10 points bad accuracy (>50), 5 good
      v_base_time + (i * INTERVAL '10 seconds')
    );
  END LOOP;
  SELECT validate_run_integrity(v_run_low_acc) INTO v_res;
  RAISE NOTICE '5. Low Accuracy Validation (Should Fail - Too Few Good Points): %', v_res;

  
  -- 6. Duplicate Timestamps & Backwards Time
  INSERT INTO runs (id, user_id, status) VALUES (v_run_dup_ts, v_user_2, 'active');
  FOR i IN 1..15 LOOP
    INSERT INTO run_points (run_id, user_id, geom, accuracy, timestamp)
    VALUES (
      v_run_dup_ts, v_user_2, 
      ST_SetSRID(ST_MakePoint(0 + (i * 0.0001), 0), 4326), 
      5.0, 
      v_base_time -- All exact same timestamp
    );
  END LOOP;
  SELECT validate_run_integrity(v_run_dup_ts) INTO v_res;
  RAISE NOTICE '6. Duplicate Timestamp Validation (Should Fail - Too Few Good Points): %', v_res;


  -- 7. Identify Double-Finalize Idempotency via atomic UPDATE
  -- Simulating edge function query 1st attempt:
  UPDATE runs SET status = 'processing' WHERE id = v_run_dup_ts AND status = 'active';
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RAISE NOTICE '7. Finalize Attempt 1 (Active -> Processing): % rows updated', v_affected_rows;

  -- Simulating edge function query 2nd concurrent attempt:
  UPDATE runs SET status = 'processing' WHERE id = v_run_dup_ts AND status = 'active';
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RAISE NOTICE '8. Finalize Attempt 2 (Active -> Processing while already processing): % rows updated', v_affected_rows;

END $$;
