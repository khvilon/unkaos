-- Step 1: Update the available_values field to ensure it's valid JSON
UPDATE public.fields
SET available_values = CASE
    WHEN available_values IS NULL THEN NULL::jsonb
    WHEN NOT (available_values ~ '^\s*[\[\{]' AND available_values ~ '[\]\}]\s*$') THEN
        jsonb_build_array(jsonb_build_object('val', available_values::text))
    ELSE available_values::jsonb
END;

-- Step 2: Change the column type from text to jsonb
ALTER TABLE public.fields
  ALTER COLUMN available_values
  SET DATA TYPE jsonb
  USING available_values::jsonb;
