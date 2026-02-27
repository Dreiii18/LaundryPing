-- Add 'maintenance' status to machines
ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_status_check;
ALTER TABLE machines ADD CONSTRAINT machines_status_check CHECK (status IN ('active', 'inactive', 'maintenance'));
