-- ============================================================
-- FIX: Allow admins to read ALL data (for admin portal)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ========== PROFILES ==========
-- Drop ALL existing SELECT policies on profiles to avoid conflicts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Users read own profile, admins read all
CREATE POLICY "Users read own profile, admins read all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== ASSIGNMENTS ==========
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'assignments' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON assignments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own assignments, admins read all"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== STUDY_SESSIONS ==========
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'study_sessions' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON study_sessions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own sessions, admins read all"
  ON study_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== NOTES ==========
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'notes' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON notes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own notes, admins read all"
  ON notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== DECKS ==========
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'decks' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON decks', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own decks, admins read all"
  ON decks
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== GRADES ==========
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'grades' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON grades', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own grades, admins read all"
  ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== ALSO FIX UPDATE POLICY FOR ADMIN ==========
-- Admins need to update profiles (change plans, toggle admin)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users update own profile, admins update all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== ADMIN DELETE POLICY ==========
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========== MAKE SURE RLS IS ENABLED ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- ========== VERIFY ==========
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'assignments', 'study_sessions', 'notes', 'decks', 'grades')
ORDER BY tablename, cmd;
