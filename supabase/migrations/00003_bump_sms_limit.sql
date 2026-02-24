-- Bump free tier SMS limit from 50 to 200
ALTER TABLE laundromats ALTER COLUMN sms_limit SET DEFAULT 200;
UPDATE laundromats SET sms_limit = 200 WHERE sms_limit = 50;
