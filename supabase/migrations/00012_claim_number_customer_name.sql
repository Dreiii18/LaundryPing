-- Add claim_number and customer_name columns to jobs
ALTER TABLE jobs ADD COLUMN claim_number SMALLINT;
ALTER TABLE jobs ADD COLUMN customer_name TEXT CHECK (char_length(customer_name) <= 60);
ALTER TABLE jobs ADD COLUMN claim_date DATE GENERATED ALWAYS AS
  ((created_at AT TIME ZONE 'Asia/Manila')::date) STORED;

-- Unique constraint (NULLs don't conflict, so old jobs are safe)
ALTER TABLE jobs ADD CONSTRAINT jobs_laundromat_claim_unique
  UNIQUE (laundromat_id, claim_date, claim_number);

-- Index for customer name search
CREATE INDEX idx_jobs_customer_name ON jobs(customer_name)
  WHERE customer_name IS NOT NULL;

-- RPC: generate next claim number atomically
CREATE OR REPLACE FUNCTION public.generate_claim_number(p_laundromat_id UUID)
RETURNS SMALLINT AS $$
DECLARE
  v_today DATE;
  v_next SMALLINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.laundromats
    WHERE id = p_laundromat_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Manila')::date;

  -- Advisory lock serializes per laundromat+date (prevents first-of-day race)
  PERFORM pg_advisory_xact_lock(hashtext(p_laundromat_id::text || v_today::text));

  SELECT COALESCE(MAX(claim_number), 0) + 1 INTO v_next
  FROM public.jobs
  WHERE laundromat_id = p_laundromat_id AND claim_date = v_today;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
