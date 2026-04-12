-- ============================================================
-- Migration: Add admin role to profiles
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add is_admin column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Make yourself an admin (replace with your email)
UPDATE profiles SET is_admin = TRUE WHERE email = 'haydenking@icloud.com';

-- 3. RLS policy: only admins can read all profiles (for admin panel)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
