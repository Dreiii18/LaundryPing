-- Onboarding wizard gate + lifecycle email tracking.
-- onboarding_completed_at = NULL  ⇒ user must complete the 3-step wizard.
-- d{N}_email_sent_at = NULL       ⇒ that lifecycle email is still eligible to send.

ALTER TABLE laundromats
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS d2_email_sent_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS d7_email_sent_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS d30_email_sent_at       TIMESTAMPTZ;

-- Backfill: existing users are already past onboarding — don't trap them in the wizard.
-- New signups created after this migration get NULL by default and must complete the wizard.
UPDATE laundromats SET onboarding_completed_at = created_at WHERE onboarding_completed_at IS NULL;

-- Drop any previous misaligned index (the cron filters on lifecycle stages, not onboarding).
DROP INDEX IF EXISTS idx_laundromats_onboarding_pending;

-- Index aligned to the cron query (any pending lifecycle stage).
CREATE INDEX IF NOT EXISTS idx_laundromats_lifecycle_pending
  ON laundromats (created_at)
  WHERE d2_email_sent_at IS NULL
     OR d7_email_sent_at IS NULL
     OR d30_email_sent_at IS NULL;

-- Protect onboarding gate + lifecycle email stamps from client-side mutation.
-- Without this, an authenticated user can set onboarding_completed_at = NOW()
-- via the Supabase JS client and skip the wizard entirely, or null-out their
-- d{N}_email_sent_at columns to replay lifecycle emails.
-- Mirrors the silent-restoration pattern of protect_credit_columns (00001:251).
CREATE OR REPLACE FUNCTION public.protect_lifecycle_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_role IN ('authenticated', 'anon') THEN
    NEW.onboarding_completed_at := OLD.onboarding_completed_at;
    NEW.welcome_email_sent_at   := OLD.welcome_email_sent_at;
    NEW.d2_email_sent_at        := OLD.d2_email_sent_at;
    NEW.d7_email_sent_at        := OLD.d7_email_sent_at;
    NEW.d30_email_sent_at       := OLD.d30_email_sent_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trg_protect_lifecycle_columns ON public.laundromats;
CREATE TRIGGER trg_protect_lifecycle_columns
  BEFORE UPDATE ON public.laundromats
  FOR EACH ROW EXECUTE FUNCTION public.protect_lifecycle_columns();
