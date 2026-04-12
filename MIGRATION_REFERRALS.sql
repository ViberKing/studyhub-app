-- ============================================================
-- Migration: Referral Partner System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add referral tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_referral_partner BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- 2. Referral access codes (admin generates these for special people)
CREATE TABLE IF NOT EXISTS referral_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT,               -- optional note e.g. "For Jack"
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_by UUID REFERENCES profiles(id),
  claimed_at TIMESTAMPTZ
);

-- 3. Referral partners (users who activated with an access code)
CREATE TABLE IF NOT EXISTS referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) NOT NULL,
  referral_slug TEXT UNIQUE NOT NULL,     -- unique slug for link e.g. "jack2024"
  commission_rate NUMERIC DEFAULT 0.50,   -- 50%
  total_earned NUMERIC DEFAULT 0,
  activated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Individual referrals (who referred whom)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) NOT NULL,
  referee_id UUID UNIQUE REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending'  -- pending (no payment yet), active (paying), cancelled
);

-- 5. Commission log (each payment from a referred user)
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES referrals(id) NOT NULL,
  referrer_id UUID REFERENCES profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,         -- commission amount in GBP
  payment_amount NUMERIC NOT NULL, -- original payment amount
  currency TEXT DEFAULT 'gbp',
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS policies
ALTER TABLE referral_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- Access codes: users can read unclaimed codes (to validate), admins can read all
CREATE POLICY "Users can validate access codes"
  ON referral_access_codes FOR SELECT TO authenticated
  USING (claimed_by IS NULL OR claimed_by = auth.uid());

CREATE POLICY "Admins can manage access codes"
  ON referral_access_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Users can claim unclaimed codes
CREATE POLICY "Users can claim access codes"
  ON referral_access_codes FOR UPDATE TO authenticated
  USING (claimed_by IS NULL)
  WITH CHECK (claimed_by = auth.uid());

-- Referral partners: users can read their own, admins can read all
CREATE POLICY "Partners can read own data"
  ON referral_partners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can look up partner by slug"
  ON referral_partners FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "System can insert partners"
  ON referral_partners FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Referrals: referrer can read their own
CREATE POLICY "Referrers can read own referrals"
  ON referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Commissions: referrer can read their own
CREATE POLICY "Referrers can read own commissions"
  ON referral_commissions FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

-- Admins full access on all referral tables
CREATE POLICY "Admins full access referral_partners"
  ON referral_partners FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins full access referrals"
  ON referrals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Admins full access referral_commissions"
  ON referral_commissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- 7. Index for fast referral lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_partners_slug ON referral_partners(referral_slug);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
