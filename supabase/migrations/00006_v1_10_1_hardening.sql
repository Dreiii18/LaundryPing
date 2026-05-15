-- v1.10.1 hardening pass.
--
-- (1) Re-revoke EXECUTE on sync_job_from_phases() for repo parity with remote.
--     Remote already had a `20260503031445_job_phases_revoke_trigger_execute`
--     hot-patch applied between 00003 and 00004; that file never made it into
--     the repo. The REVOKE here is idempotent — safe to re-apply.
--
-- (2) Trigger fix: is_overdue must clear whenever a phase becomes active, not
--     only on pending->in_progress transitions. The previous condition gated
--     the reset on `v_current_status = 'pending'`, which left two cases stuck:
--       - 1-tap-start jobs created directly as 'in_progress' (never see the
--         pending state, so the gate never fires).
--       - Backfilled 'legacy' jobs that were already is_overdue=true at
--         migration time — no phase transition can ever clear them.
--     Now is_overdue resets unconditionally any time a phase is active.

REVOKE EXECUTE ON FUNCTION public.sync_job_from_phases() FROM PUBLIC, anon, authenticated;

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
    UPDATE public.jobs
    SET status = 'ready_for_pickup',
        machine_id = NULL
    WHERE id = v_job_id
      AND status NOT IN ('completed', 'cancelled', 'ready_for_pickup');
  ELSIF v_active_count > 0 THEN
    -- Set started_at on first activation; clear is_overdue any time a phase
    -- is active (covers 1-tap-start in_progress creation and legacy backfill).
    UPDATE public.jobs
    SET status     = 'in_progress',
        machine_id = v_active_machine,
        started_at = CASE WHEN v_current_status = 'pending' THEN now() ELSE started_at END,
        is_overdue = false
    WHERE id = v_job_id;
  ELSIF v_done_count > 0 THEN
    -- Mid-flow: at least one phase finished, more queued. Keep 'in_progress'
    -- with machine_id NULL so it doesn't demote to "Queue".
    UPDATE public.jobs
    SET status = 'in_progress',
        machine_id = NULL
    WHERE id = v_job_id;
  ELSE
    UPDATE public.jobs
    SET status = 'pending',
        machine_id = NULL
    WHERE id = v_job_id AND status = 'in_progress';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.sync_job_from_phases() FROM PUBLIC, anon, authenticated;
