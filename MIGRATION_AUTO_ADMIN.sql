-- Auto-admin trigger: automatically grants gifted (Pro) + admin to specified emails
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Step 1: Create the function that checks if a new profile's email is in the admin list
CREATE OR REPLACE FUNCTION auto_grant_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  admin_emails TEXT[] := ARRAY[
    'kinghay2005@outlook.com',
    'hatty@sedwill.com',
    'harriet.sedwill@icloud.com'
  ];
BEGIN
  -- Get the email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- If email is in the admin list, grant gifted + admin
  IF user_email = ANY(admin_emails) THEN
    NEW.plan := 'gifted';
    NEW.is_admin := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger (fires before insert on profiles)
DROP TRIGGER IF EXISTS auto_admin_on_signup ON profiles;
CREATE TRIGGER auto_admin_on_signup
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_admin();

-- Step 3: Also update any existing profiles that match (in case they already signed up)
UPDATE profiles
SET plan = 'gifted', is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'kinghay2005@outlook.com',
    'hatty@sedwill.com',
    'harriet.sedwill@icloud.com'
  )
);
