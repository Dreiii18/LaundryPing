-- Fix 1: Recreate mark_overdue_jobs with explicit search_path
CREATE OR REPLACE FUNCTION mark_overdue_jobs(p_laundromat_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE jobs
  SET is_overdue = true
  WHERE laundromat_id = p_laundromat_id
    AND status = 'in_progress'
    AND is_overdue = false
    AND started_at < (now() AT TIME ZONE 'Asia/Manila')::date::timestamptz;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix 2: Recreate update_blog_posts_updated_at with explicit search_path
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix 3: Add covering index for laundromats.sms_plan_id foreign key
CREATE INDEX IF NOT EXISTS idx_laundromats_sms_plan_id ON laundromats (sms_plan_id);
