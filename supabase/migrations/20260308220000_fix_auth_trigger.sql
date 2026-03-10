-- Make the new user trigger extremely resilient against duplicate usernames and missing metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  new_invite_code TEXT;
  counter INT := 1;
BEGIN
  -- 1. Username generation with duplicate fallback
  base_username := COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8));
  final_username := base_username;
  
  -- Prevent "Database error saving new user" on UNIQUE constraint violation
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || '_' || counter;
    counter := counter + 1;
  END LOOP;

  -- 2. Clean invite code generation with duplicate fallback
  LOOP
    new_invite_code := substr(md5(random()::text), 1, 6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = new_invite_code);
  END LOOP;

  -- 3. Insert profile safely, defaulting missing metadata safely
  INSERT INTO public.profiles (
    id, 
    username, 
    invite_code, 
    city, 
    color_index
  )
  VALUES (
    new.id, 
    final_username,
    new_invite_code,
    COALESCE(new.raw_user_meta_data->>'city', 'Global'),
    COALESCE((new.raw_user_meta_data->>'color_index')::INT, 0)
  );

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Fallback for extreme race conditions
    INSERT INTO public.profiles (id, username, invite_code)
    VALUES (new.id, 'user_' || substr(new.id::text, 1, 8), substr(new.id::text, 1, 6));
    RETURN new;
  WHEN OTHERS THEN
    -- A silent return here prevents Supabase from blocking the user signup entirely
    -- The client SDK will attempt to recover the missing profile row upon login
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
