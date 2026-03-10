-- Drop the existing buggy policy that blocked users from updating their own active runs to processing status
DROP POLICY IF EXISTS "Users update own active runs." ON runs;

-- Recreate it to allow updating the status, as long as it starts as active and belongs to the user
CREATE POLICY "Users update own active runs." 
  ON runs FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'active') WITH CHECK (auth.uid() = user_id);