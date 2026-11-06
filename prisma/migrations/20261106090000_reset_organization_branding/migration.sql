-- One-time reset explicitly requested for all organizations.
-- Preserve media records and files for audit/rollback; only remove active
-- organization logo/header associations, including unpublished organizations.
UPDATE "organizations"
SET "logoId" = NULL,
    "headerId" = NULL
WHERE "logoId" IS NOT NULL OR "headerId" IS NOT NULL;
