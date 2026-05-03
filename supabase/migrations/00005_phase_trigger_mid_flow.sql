-- Fix: between-phases jobs were demoting to status='pending', landing them in
-- the "Queue" tab next to fresh untouched jobs.
--
-- The previous trigger ELSE branch (only-pending phases) couldn't tell apart
-- two cases:
--   (a) fresh queue: customer just arrived, no phase has run yet
--   (b) mid-flow:    wash done, dry queued waiting for a dryer
-- Both look identical to (no in_progress phase, has pending phases). We were
-- writing 'pending' for both, which conflated them in the UI.
--
-- New rule: if any phase has already completed or been skipped, the job is
-- mid-flow — keep it 'in_progress' (with machine_id=NULL) so it stays in the
-- Today's Jobs tab with a "Start <next phase>" button. Only mark 'pending'
-- when nothing has ever started.

CREATE OR REPLACE FUNCTION public.sync_job_from_phases()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id          UUID := COALESCE(NEW.job_id, OLD.job_id);
  v_phase_lr        UUID := COALESCE(NEW.laundromat_id, OLD.laundromat_id);
  v_active_machine  UUID;
  v_active_count    INTEGER;
  v_open_count      INTEGER;
  v_done_count      INTEGER;
  v_current_status  TEXT;
  v_job_lr          UUID;
BEGIN
  SELECT status, laundromat_id INTO v_current_status, v_job_lr
  FROM public.jobs WHERE id = v_job_id FOR UPDATE;

  IF v_job_lr IS NULL THEN
    RAISE EXCEPTION 'Phase % references nonexistent job %', COALESCE(NEW.id, OLD.id), v_job_id;
  END IF;
  IF v_job_lr <> v_phase_lr THEN
    RAISE EXCEPTION 'Phase laundromat_id % does not match parent job laundromat_id %', v_phase_lr, v_job_lr;
  END IF;

  IF v_current_status IN ('completed', 'cancelled') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'in_progress'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')),
    COUNT(*) FILTER (WHERE status IN ('completed', 'skipped')),
    (SELECT machine_id FROM public.job_phases
       WHERE job_id = v_job_id AND status = 'in_progress'
       ORDER BY sequence LIMIT 1)
  INTO v_active_count, v_open_count, v_done_count, v_active_machine
  FROM public.job_phases
  WHERE job_id = v_job_id;

  IF v_open_count = 0 THEN
    -- All phases done or skipped: ready for customer pickup.
    UPDATE public.jobs
    SET status = 'ready_for_pickup',
        machine_id = NULL
    WHERE id = v_job_id
      AND status NOT IN ('completed', 'cancelled', 'ready_for_pickup');
  ELSIF v_active_count > 0 THEN
    -- A phase is currently running.
    UPDATE public.jobs
    SET status     = 'in_progress',
        machine_id = v_active_machine,
        started_at = CASE WHEN v_current_status = 'pending' THEN now() ELSE started_at END,
        is_overdue = CASE WHEN v_current_status = 'pending' THEN false ELSE is_overdue END
    WHERE id = v_job_id;
  ELSIF v_done_count > 0 THEN
    -- Mid-flow: at least one phase has finished, more are queued. Keep the
    -- job 'in_progress' so it doesn't visually demote to "Queue" alongside
    -- fresh untouched jobs. machine_id NULL means no machine is currently in
    -- use (the next phase needs to be started).
    UPDATE public.jobs
    SET status = 'in_progress',
        machine_id = NULL
    WHERE id = v_job_id;
  ELSE
    -- Truly fresh queue: nothing has ever started.
    UPDATE public.jobs
    SET status = 'pending',
        machine_id = NULL
    WHERE id = v_job_id AND status = 'in_progress';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.sync_job_from_phases() FROM PUBLIC, anon, authenticated;
