-- LaundryPing Seed Data
-- NOTE: This seed file requires a real user_id from auth.users.
-- Uncomment and replace the UUID below after creating a test user via the app.

-- Step 1: Create a test laundromat (normally auto-created by trigger)
-- INSERT INTO laundromats (id, user_id, name, address, sms_limit)
-- VALUES (
--     'a0000000-0000-0000-0000-000000000001',
--     '<YOUR_AUTH_USER_ID_HERE>',
--     'Sparkle Clean Laundry',
--     '123 Rizal Ave, Manila',
--     50
-- );

-- Step 2: Create some machines
-- INSERT INTO machines (id, laundromat_id, label, status) VALUES
--     ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'M-01', 'active'),
--     ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'M-02', 'active'),
--     ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'M-03', 'inactive'),
--     ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'M-04', 'active'),
--     ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'M-05', 'active');

-- Step 3: Create sample jobs
-- INSERT INTO jobs (id, laundromat_id, machine_id, customer_phone_encrypted, customer_phone_masked, notes, status) VALUES
--     ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'encrypted_phone_1', '09XX-XXX-1234', '2 loads whites', 'in_progress'),
--     ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'encrypted_phone_2', '09XX-XXX-5678', 'Blankets', 'in_progress');
