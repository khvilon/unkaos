-- Ensure field_values upsert works by issue_uuid + field_uuid
-- 1) Deduplicate active rows (keep the latest, soft-delete the rest)
-- 2) Add unique partial index for active rows

WITH ranked AS (
  SELECT
    uuid,
    ROW_NUMBER() OVER (
      PARTITION BY issue_uuid, field_uuid
      ORDER BY updated_at DESC, created_at DESC, uuid DESC
    ) AS rn
  FROM public.field_values
  WHERE deleted_at IS NULL
)
UPDATE public.field_values fv
SET deleted_at = NOW(),
    updated_at = NOW()
FROM ranked r
WHERE fv.uuid = r.uuid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS field_values_issue_uuid_field_uuid_uq
  ON public.field_values(issue_uuid, field_uuid)
  WHERE deleted_at IS NULL;



