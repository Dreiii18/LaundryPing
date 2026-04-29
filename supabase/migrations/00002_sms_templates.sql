-- Customizable SMS templates per laundromat.
-- Two free-form text columns (queue + completion) with {{shop_name}}, {{customer_name}},
-- {{job_id}} variable substitution handled in-app. sender_name is reserved for a
-- future paid tier (custom Semaphore sender) and is unused for now.

ALTER TABLE laundromats
  ADD COLUMN sms_queue_template TEXT,
  ADD COLUMN sms_completion_template TEXT,
  ADD COLUMN sender_name TEXT;

-- Backfill any pre-existing rows with shop-name-prefixed defaults so the switch
-- from hardcoded templates to free-form is seamless.
UPDATE laundromats
SET
  sms_queue_template = '[' || name || '] Salamat! Nakapila na po ang laundry niyo. I-text po namin pag tapos na. - ' || name,
  sms_completion_template = '[' || name || '] Hi {{customer_name}}, ready na po ang laundry niyo! Salamat po. - ' || name
WHERE sms_queue_template IS NULL OR sms_completion_template IS NULL;

-- Seed both templates for new signups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_shop_name TEXT := COALESCE(NEW.raw_user_meta_data->>'laundromat_name', 'My Laundromat');
BEGIN
  INSERT INTO public.laundromats (
    user_id,
    name,
    sms_free_credits,
    sms_paid_credits,
    sms_queue_template,
    sms_completion_template
  )
  VALUES (
    NEW.id,
    v_shop_name,
    50,
    0,
    '[' || v_shop_name || '] Salamat! Nakapila na po ang laundry niyo. I-text po namin pag tapos na. - ' || v_shop_name,
    '[' || v_shop_name || '] Hi {{customer_name}}, ready na po ang laundry niyo! Salamat po. - ' || v_shop_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
