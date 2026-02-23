-- LaundryPing Phase 1 MVP - Initial Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- LAUNDROMATS table
CREATE TABLE laundromats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    sms_limit INTEGER NOT NULL DEFAULT 50,
    sms_used_this_month INTEGER NOT NULL DEFAULT 0,
    billing_cycle_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT laundromats_user_id_unique UNIQUE (user_id)
);
CREATE INDEX idx_laundromats_user_id ON laundromats(user_id);

-- MACHINES table
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('washer', 'dryer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT machines_laundromat_label_unique UNIQUE (laundromat_id, label)
);
CREATE INDEX idx_machines_laundromat_id ON machines(laundromat_id);

-- JOBS table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
    customer_phone_encrypted TEXT NOT NULL,
    customer_phone_masked TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    sms_sent BOOLEAN NOT NULL DEFAULT false,
    payment_method TEXT CHECK (payment_method IN ('cash', 'ewallet', 'card', 'bank_transfer')),
    pay_amount NUMERIC(10,2),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_laundromat_id ON jobs(laundromat_id);
CREATE INDEX idx_jobs_laundromat_started ON jobs(laundromat_id, started_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status = 'in_progress';

-- SMS_LOGS table
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

-- RLS Policies
ALTER TABLE laundromats ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own laundromat" ON laundromats FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own laundromat" ON laundromats FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own machines" ON machines FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own machines" ON machines FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own machines" ON machines FOR UPDATE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid())) WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own machines" ON machines FOR DELETE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own jobs" ON jobs FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own jobs" ON jobs FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own jobs" ON jobs FOR UPDATE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own sms logs" ON sms_logs FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own sms logs" ON sms_logs FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = auth.uid()));

-- Trigger: Auto-create laundromat on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.laundromats (user_id, name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'shop_name', 'My Laundromat')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Stored Procedure: Lazy billing cycle reset
CREATE OR REPLACE FUNCTION public.ensure_billing_cycle(p_laundromat_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.laundromats
  SET sms_used_this_month = 0,
      billing_cycle_start = date_trunc('month', CURRENT_DATE)::date,
      updated_at = now()
  WHERE id = p_laundromat_id
    AND billing_cycle_start < date_trunc('month', CURRENT_DATE)::date;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Stored Procedure: Atomic SMS quota check and increment
CREATE OR REPLACE FUNCTION public.check_and_increment_sms_quota(p_laundromat_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT sms_used_this_month, sms_limit INTO v_used, v_limit
    FROM public.laundromats WHERE id = p_laundromat_id FOR UPDATE;
  IF v_used >= v_limit THEN
    RETURN FALSE;
  END IF;
  UPDATE public.laundromats SET sms_used_this_month = sms_used_this_month + 1,
    updated_at = now() WHERE id = p_laundromat_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SET search_path = public;
