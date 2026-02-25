-- Migration: SMS Plans (free → paid model)
-- Creates sms_plans reference table, alters laundromats + jobs, updates stored procedures

-- 1. Create sms_plans reference table
CREATE TABLE sms_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('starter', 'growth', 'scale')),
  label TEXT NOT NULL,
  sms_limit INTEGER NOT NULL,
  price_php NUMERIC(10,2) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the 3 plans
INSERT INTO sms_plans (tier, label, sms_limit, price_php, description, sort_order) VALUES
  ('starter', 'Starter', 300, 299, 'Para sa maliliit na laundromat', 1),
  ('growth', 'Growth', 600, 539, 'Para sa lumalaking negosyo', 2),
  ('scale', 'Scale', 1200, 959, 'Para sa malalaking laundromat', 3);

-- RLS: allow authenticated users to read plans (public reference data)
ALTER TABLE sms_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON sms_plans FOR SELECT USING (true);

-- 2. Alter laundromats: add plan columns, migrate existing users
ALTER TABLE laundromats
  ADD COLUMN sms_plan_id UUID REFERENCES sms_plans(id),
  ADD COLUMN sms_plan_activated_at TIMESTAMPTZ,
  ADD COLUMN sms_plan_expires_at TIMESTAMPTZ;

-- Migrate existing users: no plan, zero limit
UPDATE laundromats SET sms_plan_id = NULL, sms_limit = 0;

-- Change default sms_limit to 0 for new rows
ALTER TABLE laundromats ALTER COLUMN sms_limit SET DEFAULT 0;

-- 3. Alter jobs: add notify_sms, make phone columns nullable
ALTER TABLE jobs
  ADD COLUMN notify_sms BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE jobs
  ALTER COLUMN customer_phone_encrypted DROP NOT NULL,
  ALTER COLUMN customer_phone_masked DROP NOT NULL;

-- 4. Update handle_new_user() trigger: new users get sms_limit = 0
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.laundromats (user_id, name, sms_limit)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'laundromat_name', 'My Laundromat'),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Update check_and_increment_sms_quota() to check plan + expiry
CREATE OR REPLACE FUNCTION check_and_increment_sms_quota(p_laundromat_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_used INTEGER;
  v_limit INTEGER;
  v_plan_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT sms_used_this_month, sms_limit, sms_plan_id, sms_plan_expires_at
  INTO v_used, v_limit, v_plan_id, v_expires_at
  FROM laundromats
  WHERE id = p_laundromat_id
  FOR UPDATE;

  -- Must have an active plan
  IF v_plan_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Plan must not be expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN FALSE;
  END IF;

  -- Check quota
  IF v_used >= v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE laundromats
  SET sms_used_this_month = sms_used_this_month + 1
  WHERE id = p_laundromat_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Admin helper function to activate plans
CREATE OR REPLACE FUNCTION activate_sms_plan(p_user_id UUID, p_plan_tier TEXT, p_duration_days INT DEFAULT 30)
RETURNS VOID AS $$
BEGIN
  UPDATE laundromats l
  SET sms_plan_id = p.id,
      sms_limit = p.sms_limit,
      sms_plan_activated_at = now(),
      sms_plan_expires_at = now() + (p_duration_days || ' days')::interval,
      sms_used_this_month = 0,
      billing_cycle_start = date_trunc('month', CURRENT_DATE)::date,
      updated_at = now()
  FROM sms_plans p
  WHERE p.tier = p_plan_tier AND l.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
