-- Add 'gifted' as a valid plan type
ALTER TABLE profiles DROP CONSTRAINT profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('trial', 'essential', 'plus', 'pro', 'cancelled', 'gifted'));

-- To gift an account (run this with the person's email):
-- UPDATE profiles SET plan = 'gifted' WHERE email = 'friend@example.com';
