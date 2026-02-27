-- Atomic SMS quota decrement (used when SMS send fails after increment)
CREATE OR REPLACE FUNCTION decrement_sms_quota(p_laundromat_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE laundromats
  SET sms_used_this_month = sms_used_this_month - 1,
      updated_at = now()
  WHERE id = p_laundromat_id
    AND sms_used_this_month > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
