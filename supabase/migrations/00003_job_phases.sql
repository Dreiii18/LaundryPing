-- Phase-based job model.
-- A job now consists of one or more "phases" (wash → dry → fold). Machine
-- occupancy is derived from job_phases (not jobs.machine_id) so a washer is
-- freed the moment its wash phase completes, even though the job lives on.
-- jobs.machine_id is kept as a denormalized "currently active machine" pointer
-- for backward-compatible reads; it is maintained by the trg_sync_job_from_phases
-- trigger and can be dropped in a later migration.

-- =============================================================================
-- Schema additions
-- =============================================================================

-- Machines get a type so phase assignment can offer the right hardware.
-- Default 'combo' on backfill preserves current behavior (any machine fits any phase).
ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS machine_type TEXT NOT NULL DEFAULT 'combo'
    CHECK (machine_type IN ('washer', 'dryer', 'combo', 'other'));

-- Per-laundromat config: which services are operational phases, what machine
-- type they need, and how long they typically take. Mirrors the service_types
-- JSONB pattern.
ALTER TABLE laundromats
  ADD COLUMN IF NOT EXISTS service_phase_config JSONB NOT NULL DEFAULT '{
    "Wash": {"is_phase": true, "machine_type": "washer", "default_minutes": 45, "sequence": 1},
    "Dry":  {"is_phase": true, "machine_type": "dryer",  "default_minutes": 50, "sequence": 2},
    "Fold": {"is_phase": true, "machine_type": null,     "default_minutes": 15, "sequence": 3}
  }'::jsonb;

-- New job status: all phases done, awaiting customer pickup + SMS.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled'));

-- Update partial index on jobs.status to include the new status.
DROP INDEX IF EXISTS idx_jobs_status;
CREATE INDEX idx_jobs_status ON jobs(status)
  WHERE status IN ('pending', 'in_progress', 'ready_for_pickup');

-- =============================================================================
-- job_phases
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  laundromat_id UUID NOT NULL REFERENCES laundromats(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE RESTRICT,
  sequence SMALLINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR (estimated_minutes > 0 AND estimated_minutes <= 1440)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_phases_job_seq_unique UNIQUE (job_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_job_phases_job_id ON job_phases(job_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_laundromat_status ON job_phases(laundromat_id, status);
CREATE INDEX IF NOT EXISTS idx_job_phases_machine_active
  ON job_phases(machine_id) WHERE status = 'in_progress';

-- One machine can only be in one in_progress phase at a time. Concurrent
-- "Start phase" requests fight here at the DB level; second one gets 23505.
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_phases_machine_unique_active
  ON job_phases(machine_id) WHERE status = 'in_progress' AND machine_id IS NOT NULL;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE job_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job phases" ON job_phases
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can insert own job phases" ON job_phases
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can update own job phases" ON job_phases
  FOR UPDATE TO authenticated
  USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can delete own job phases" ON job_phases
  FOR DELETE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- =============================================================================
-- Trigger: derive jobs.status and jobs.machine_id from phase aggregate
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_job_from_phases()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id          UUID := COALESCE(NEW.job_id, OLD.job_id);
  v_active_machine  UUID;
  v_active_count    INTEGER;
  v_open_count      INTEGER;       -- pending + in_progress
  v_current_status  TEXT;
BEGIN
  SELECT status INTO v_current_status FROM public.jobs WHERE id = v_job_id FOR UPDATE;

  -- Terminal job statuses are never auto-mutated.
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
    -- All phases done or skipped: ready for customer pickup.
    UPDATE public.jobs
    SET status = 'ready_for_pickup',
        machine_id = NULL
    WHERE id = v_job_id
      AND status NOT IN ('completed', 'cancelled', 'ready_for_pickup');
  ELSIF v_active_count > 0 THEN
    UPDATE public.jobs
    SET status = 'in_progress',
        machine_id = v_active_machine,
        started_at = COALESCE(started_at, now())
    WHERE id = v_job_id;
  ELSE
    -- Only pending phases left (active phase just completed, next one not started yet).
    UPDATE public.jobs
    SET status = 'pending',
        machine_id = NULL
    WHERE id = v_job_id AND status = 'in_progress';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_job_from_phases ON job_phases;
CREATE TRIGGER trg_sync_job_from_phases
  AFTER INSERT OR UPDATE OR DELETE ON job_phases
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_from_phases();

-- =============================================================================
-- Backfill: convert in-flight jobs to single-phase shape
-- =============================================================================

-- Each existing pending/in_progress job gets one 'legacy' phase row that mirrors
-- its current machine + status. The trigger fires on INSERT; suppress its job
-- mutations during backfill by inserting a row whose status matches the job's
-- current status (the trigger reads jobs first, sees the current status, and
-- writes the same value back).
INSERT INTO job_phases (job_id, laundromat_id, phase_type, machine_id, sequence, status, started_at)
SELECT
  id,
  laundromat_id,
  'legacy',
  machine_id,
  1,
  CASE WHEN status = 'in_progress' THEN 'in_progress' ELSE 'pending' END,
  CASE WHEN status = 'in_progress' THEN started_at ELSE NULL END
FROM jobs
WHERE status IN ('pending', 'in_progress')
  AND NOT EXISTS (SELECT 1 FROM job_phases WHERE job_phases.job_id = jobs.id);
