-- LaundryPing — Consolidated Schema
-- Credit-based SMS model: 50 free SMS/month + purchasable top-up packs.

-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Tables
-- =============================================================================

-- LAUNDROMATS
CREATE TABLE laundromats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  sms_free_credits INTEGER NOT NULL DEFAULT 50,
  sms_paid_credits INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_services TEXT[] NOT NULL DEFAULT ARRAY['Wash', 'Dry'],
  CONSTRAINT laundromats_user_id_unique UNIQUE (user_id),
  CONSTRAINT chk_sms_free_credits CHECK (sms_free_credits >= 0 AND sms_free_credits <= 50),
  CONSTRAINT chk_sms_paid_credits CHECK (sms_paid_credits >= 0)
);
CREATE INDEX idx_laundromats_user_id ON laundromats(user_id);

-- MACHINES
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT machines_laundromat_label_unique UNIQUE (laundromat_id, label)
);
CREATE INDEX idx_machines_laundromat_id ON machines(laundromat_id);

-- JOBS
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE RESTRICT,
  customer_phone_encrypted TEXT,
  customer_phone_masked TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notify_sms BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT CHECK (payment_method IN ('cash', 'ewallet', 'card', 'bank_transfer')),
  pay_amount NUMERIC(10,2),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  overdue_reason TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_laundromat_id ON jobs(laundromat_id);
CREATE INDEX idx_jobs_laundromat_started ON jobs(laundromat_id, started_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_jobs_machine_id ON jobs(machine_id);

-- SMS_LOGS
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered')),
  provider_message_id TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sms_logs_job_id_unique UNIQUE (job_id)
);
CREATE INDEX idx_sms_logs_laundromat_id ON sms_logs(laundromat_id);

-- SMS_TOPUP_PACKAGES
CREATE TABLE sms_topup_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('pack-250', 'pack-600', 'pack-1100')),
  label TEXT NOT NULL,
  sms_credits INTEGER NOT NULL,
  price_php NUMERIC(10,2) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sms_topup_packages (slug, label, sms_credits, price_php, description, sort_order) VALUES
  ('pack-250', '250 SMS Pack', 250, 299.00, 'Ideal for small laundromats', 1),
  ('pack-600', '600 SMS Pack', 600, 699.00, 'Best for growing businesses', 2),
  ('pack-1100', '1,100 SMS Pack', 1100, 1199.00, 'Best value for high-volume shops', 3);

-- SMS_TOPUP_LOGS
CREATE TABLE sms_topup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
  package_slug TEXT NOT NULL REFERENCES sms_topup_packages(slug),
  credits_added INTEGER NOT NULL,
  price_php NUMERIC(10,2) NOT NULL,
  activated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_topup_logs_laundromat_id ON sms_topup_logs(laundromat_id);

-- BLOG_POSTS
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'LaundryPing Team',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_published ON blog_posts (published, created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE laundromats ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_topup_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_topup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Laundromats
CREATE POLICY "Users can view own laundromat" ON laundromats
  FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own laundromat" ON laundromats
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Machines
CREATE POLICY "Users can view own machines" ON machines
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can insert own machines" ON machines
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can update own machines" ON machines
  FOR UPDATE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can delete own machines" ON machines
  FOR DELETE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- Jobs
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE TO authenticated
  USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- SMS Logs
CREATE POLICY "Users can view own sms logs" ON sms_logs
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can insert own sms logs" ON sms_logs
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- SMS Topup Packages (public read)
CREATE POLICY "Authenticated users can view packages" ON sms_topup_packages
  FOR SELECT TO authenticated USING (true);

-- SMS Topup Logs
CREATE POLICY "Users can view own topup logs" ON sms_topup_logs
  FOR SELECT TO authenticated
  USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- Blog Posts (public read for published)
CREATE POLICY "Public can read published posts" ON blog_posts
  FOR SELECT USING (published = true);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-create laundromat on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.laundromats (user_id, name, sms_free_credits, sms_paid_credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'laundromat_name', 'My Laundromat'),
    50,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-update blog_posts.updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Protect credit columns + billing_cycle_start from direct user UPDATE
-- Silently preserves old values instead of raising an exception, so legitimate
-- UPDATE queries that include these columns in the SET clause are not broken.
CREATE OR REPLACE FUNCTION public.protect_credit_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_role IN ('authenticated', 'anon') THEN
    NEW.sms_free_credits := OLD.sms_free_credits;
    NEW.sms_paid_credits := OLD.sms_paid_credits;
    NEW.billing_cycle_start := OLD.billing_cycle_start;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_credit_columns
  BEFORE UPDATE ON public.laundromats
  FOR EACH ROW EXECUTE FUNCTION public.protect_credit_columns();

-- =============================================================================
-- Stored Procedures — SMS Credits
-- =============================================================================

-- Billing cycle reset + atomic credit consumption (merged to prevent TOCTOU)
CREATE OR REPLACE FUNCTION public.check_and_consume_sms_credit(p_laundromat_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_free        INTEGER;
  v_paid        INTEGER;
  v_cycle_start DATE;
BEGIN
  -- Authorization: verify caller owns this laundromat
  IF NOT EXISTS (
    SELECT 1 FROM public.laundromats
    WHERE id = p_laundromat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT sms_free_credits, sms_paid_credits, billing_cycle_start
  INTO v_free, v_paid, v_cycle_start
  FROM public.laundromats
  WHERE id = p_laundromat_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Laundromat not found: %', p_laundromat_id;
  END IF;

  -- Inline billing cycle reset
  IF v_cycle_start < date_trunc('month', CURRENT_DATE)::date THEN
    v_free := 50;
    UPDATE public.laundromats
    SET sms_free_credits    = 50,
        billing_cycle_start = date_trunc('month', CURRENT_DATE)::date,
        updated_at          = now()
    WHERE id = p_laundromat_id;
  END IF;

  -- Consume free credits first, then paid
  IF v_free > 0 THEN
    UPDATE public.laundromats
    SET sms_free_credits = sms_free_credits - 1, updated_at = now()
    WHERE id = p_laundromat_id;
    RETURN 'free';
  ELSIF v_paid > 0 THEN
    UPDATE public.laundromats
    SET sms_paid_credits = sms_paid_credits - 1, updated_at = now()
    WHERE id = p_laundromat_id;
    RETURN 'paid';
  ELSE
    RETURN 'none';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Lazy billing cycle reset (standalone, kept for direct usage)
CREATE OR REPLACE FUNCTION public.ensure_billing_cycle(p_laundromat_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Authorization: verify caller owns this laundromat
  IF NOT EXISTS (
    SELECT 1 FROM public.laundromats
    WHERE id = p_laundromat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.laundromats
  SET sms_free_credits = 50,
      billing_cycle_start = date_trunc('month', CURRENT_DATE)::date,
      updated_at = now()
  WHERE id = p_laundromat_id
    AND billing_cycle_start < date_trunc('month', CURRENT_DATE)::date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Refund one SMS credit to the specified bucket (must match what was consumed)
CREATE OR REPLACE FUNCTION public.refund_sms_credit(p_laundromat_id UUID, p_credit_type TEXT)
RETURNS VOID AS $$
BEGIN
  -- Authorization: verify caller owns this laundromat
  IF NOT EXISTS (
    SELECT 1 FROM public.laundromats
    WHERE id = p_laundromat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_credit_type NOT IN ('free', 'paid') THEN
    RAISE EXCEPTION 'Invalid credit type: %', p_credit_type;
  END IF;

  PERFORM 1 FROM public.laundromats WHERE id = p_laundromat_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Laundromat not found: %', p_laundromat_id;
  END IF;

  IF p_credit_type = 'free' THEN
    UPDATE public.laundromats
    SET sms_free_credits = sms_free_credits + 1, updated_at = now()
    WHERE id = p_laundromat_id;
  ELSE
    UPDATE public.laundromats
    SET sms_paid_credits = sms_paid_credits + 1, updated_at = now()
    WHERE id = p_laundromat_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: add top-up credits from a package (service_role only)
CREATE OR REPLACE FUNCTION public.add_sms_topup(
  p_laundromat_id UUID,
  p_package_slug  TEXT,
  p_admin_id      UUID
)
RETURNS VOID AS $$
DECLARE
  v_credits INTEGER;
  v_price   NUMERIC(10,2);
  v_rows    INTEGER;
BEGIN
  -- Authorization: restrict to service_role / admin only
  IF coalesce(current_setting('role', true), '') NOT IN ('service_role', 'supabase_admin', 'postgres') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT sms_credits, price_php
  INTO v_credits, v_price
  FROM public.sms_topup_packages
  WHERE slug = p_package_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package slug: %', p_package_slug;
  END IF;

  UPDATE public.laundromats
  SET sms_paid_credits = sms_paid_credits + v_credits, updated_at = now()
  WHERE id = p_laundromat_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Laundromat not found: %', p_laundromat_id;
  END IF;

  INSERT INTO public.sms_topup_logs (laundromat_id, package_slug, credits_added, price_php, activated_by)
  VALUES (p_laundromat_id, p_package_slug, v_credits, v_price, p_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from non-admin roles (defense in depth)
REVOKE EXECUTE ON FUNCTION public.add_sms_topup FROM PUBLIC, authenticated, anon;

-- =============================================================================
-- Stored Procedures — Jobs
-- =============================================================================

-- Mark overdue jobs (in_progress since before today in PH timezone)
CREATE OR REPLACE FUNCTION mark_overdue_jobs(p_laundromat_id UUID)
RETURNS void AS $$
BEGIN
  -- Authorization: verify caller owns this laundromat
  IF NOT EXISTS (
    SELECT 1 FROM public.laundromats
    WHERE id = p_laundromat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE jobs
  SET is_overdue = true
  WHERE laundromat_id = p_laundromat_id
    AND status = 'in_progress'
    AND is_overdue = false
    AND started_at < date_trunc('day', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
