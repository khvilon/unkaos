-- Step 1: Update non-JSON values to a valid JSON object format
UPDATE public.fields
SET available_values = CASE
    WHEN available_values IS NULL THEN available_values
    WHEN available_values::jsonb IS NULL THEN '{"val": ' || quote_literal(available_values) || '}'
    ELSE available_values
END;

-- Step 2: Change the column type from text to jsonb
ALTER TABLE public.fields
  ALTER COLUMN available_values
  SET DATA TYPE jsonb
  USING available_values::jsonb;
