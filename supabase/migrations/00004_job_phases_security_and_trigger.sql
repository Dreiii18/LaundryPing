-- Hardening pass for the phase-based job model (00003).
--
-- 1. sync_job_from_phases trigger gets a tenancy guard so a phase row whose
--    laundromat_id does not match the parent job's laundromat_id raises
--    instead of silently mutating someone else's job. The trigger is
--    SECURITY DEFINER (it must bypass jobs RLS to keep jobs.status in sync),
--    so without this guard a malicious tenant could mutate any job whose UUID
--    they could guess or harvest.
--
-- 2. The same trigger now correctly resets jobs.started_at and is_overdue when
--    a pending job is promoted to in_progress by its first phase activating.
--    The previous COALESCE(started_at, now()) was always a no-op because
--    jobs.started_at has a NOT NULL DEFAULT now(), so jobs created late at
--    night and started the next morning were instantly flagged overdue.
--
-- 3. job_phases RLS for INSERT and UPDATE now also asserts that job_id
--    references a job in the same laundromat as the phase row. Defense in
--    depth — RLS is the API-surface fail-closed, the trigger guard catches
--    service-role / future paths.

-- =============================================================================
-- Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_job_from_phases()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id          UUID := COALESCE(NEW.job_id, OLD.job_id);
  v_phase_lr        UUID := COALESCE(NEW.laundromat_id, OLD.laundromat_id);
  v_active_machine  UUID;
  v_active_count    INTEGER;
  v_open_count      INTEGER;
  v_current_status  TEXT;
  v_job_lr          UUID;
BEGIN
  SELECT status, laundromat_id INTO v_current_status, v_job_lr
  FROM public.jobs WHERE id = v_job_id FOR UPDATE;

  -- Tenancy guard.
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
    (SELECT machine_id FROM public.job_phases
       WHERE job_id = v_job_id AND status = 'in_progress'
       ORDER BY sequence LIMIT 1)
  INTO v_active_count, v_open_count, v_active_machine
  FROM public.job_phases
  WHERE job_id = v_job_id;

  IF v_open_count = 0 THEN
    UPDATE public.jobs
    SET status = 'ready_for_pickup',
        machine_id = NULL
    WHERE id = v_job_id
      AND status NOT IN ('completed', 'cancelled', 'ready_for_pickup');
  ELSIF v_active_count > 0 THEN
    -- Reset started_at + is_overdue on the first phase to actually run.
    UPDATE public.jobs
    SET status     = 'in_progress',
        machine_id = v_active_machine,
        started_at = CASE WHEN v_current_status = 'pending' THEN now() ELSE started_at END,
        is_overdue = CASE WHEN v_current_status = 'pending' THEN false ELSE is_overdue END
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

-- The function is only meant to be invoked by trg_sync_job_from_phases.
-- Revoke EXECUTE so it can't be called via PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.sync_job_from_phases() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- RLS tightening on job_phases
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert own job phases" ON job_phases;
CREATE POLICY "Users can insert own job phases" ON job_phases
  FOR INSERT WITH CHECK (
    laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_phases.job_id
        AND jobs.laundromat_id = job_phases.laundromat_id
    )
  );

DROP POLICY IF EXISTS "Users can update own job phases" ON job_phases;
CREATE POLICY "Users can update own job phases" ON job_phases
  FOR UPDATE TO authenticated
  USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (
    laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_phases.job_id
        AND jobs.laundromat_id = job_phases.laundromat_id
    )
  );
