-- Email notifications: email_logs table, plan_cancelled_at column, cancel_sms_plan procedure

-- email_logs table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundromat_id UUID REFERENCES laundromats(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'welcome',
    'plan_activated',
    'plan_expiry_reminder',
    'plan_expired',
    'plan_cancelled'
  )),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  provider_message_id TEXT,
  provider_response JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_laundromat_id ON email_logs(laundromat_id);
CREATE INDEX idx_email_logs_type_created ON email_logs(email_type, created_at DESC);

-- Idempotency: one reminder per laundromat per reminder_days value
CREATE UNIQUE INDEX idx_email_logs_reminder_idempotent
  ON email_logs(laundromat_id, email_type, (metadata->>'reminder_days'))
  WHERE email_type = 'plan_expiry_reminder' AND status = 'sent';

-- Idempotency: one expired email per laundromat per expiry date
CREATE UNIQUE INDEX idx_email_logs_expired_idempotent
  ON email_logs(laundromat_id, email_type, (metadata->>'expires_at'))
  WHERE email_type = 'plan_expired' AND status = 'sent';

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Add plan_cancelled_at to laundromats
ALTER TABLE laundromats ADD COLUMN plan_cancelled_at TIMESTAMPTZ;

-- cancel_sms_plan stored procedure
CREATE OR REPLACE FUNCTION cancel_sms_plan(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE laundromats
  SET
    sms_plan_id = NULL,
    sms_limit = 0,
    plan_cancelled_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No laundromat found for user %', p_user_id;
  END IF;
END;
$$;
