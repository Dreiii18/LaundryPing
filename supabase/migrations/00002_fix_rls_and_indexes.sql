-- Fix RLS policy performance: wrap auth.uid() in (SELECT ...) for single evaluation
-- Fix missing index on jobs.machine_id foreign key

-- ============================================================
-- LAUNDROMATS policies
-- ============================================================
DROP POLICY "Users can view own laundromat" ON laundromats;
CREATE POLICY "Users can view own laundromat" ON laundromats
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users can update own laundromat" ON laundromats;
CREATE POLICY "Users can update own laundromat" ON laundromats
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- MACHINES policies
-- ============================================================
DROP POLICY "Users can view own machines" ON machines;
CREATE POLICY "Users can view own machines" ON machines
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

DROP POLICY "Users can insert own machines" ON machines;
CREATE POLICY "Users can insert own machines" ON machines
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

DROP POLICY "Users can update own machines" ON machines;
CREATE POLICY "Users can update own machines" ON machines
  FOR UPDATE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

DROP POLICY "Users can delete own machines" ON machines;
CREATE POLICY "Users can delete own machines" ON machines
  FOR DELETE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- ============================================================
-- JOBS policies
-- ============================================================
DROP POLICY "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

DROP POLICY "Users can insert own jobs" ON jobs;
CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

DROP POLICY "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- ============================================================
-- SMS_LOGS policies
-- ============================================================
DROP POLICY "Users can view own sms logs" ON sms_logs;
CREATE POLICY "Users can view own sms logs" ON sms_logs
  FOR SELECT USING (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

DROP POLICY "Users can insert own sms logs" ON sms_logs;
CREATE POLICY "Users can insert own sms logs" ON sms_logs
  FOR INSERT WITH CHECK (laundromat_id IN (SELECT id FROM laundromats WHERE user_id = (SELECT auth.uid())));

-- ============================================================
-- Missing foreign key index
-- ============================================================
CREATE INDEX idx_jobs_machine_id ON jobs(machine_id);
