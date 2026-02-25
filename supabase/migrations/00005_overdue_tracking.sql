-- Add overdue tracking columns to jobs
ALTER TABLE jobs ADD COLUMN is_overdue BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN overdue_reason TEXT;

-- Function to mark overdue jobs (idempotent: only flips false → true)
-- Called via supabase.rpc('mark_overdue_jobs', { p_laundromat_id })
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
