DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'FirstMonthBillingPolicy'
  ) THEN
    CREATE TYPE "FirstMonthBillingPolicy" AS ENUM ('PRORATA', 'FULL_WITH_MAKEUP');
  END IF;
END $$;

ALTER TABLE "Student"
ADD COLUMN "enrollmentStartDate" TIMESTAMP(3),
ADD COLUMN "enrollmentEndDate" TIMESTAMP(3),
ADD COLUMN "firstMonthBillingPolicy" "FirstMonthBillingPolicy" NOT NULL DEFAULT 'PRORATA';

UPDATE "Student"
SET "enrollmentStartDate" = "createdAt"
WHERE "currentPlanId" IS NOT NULL
  AND "enrollmentStartDate" IS NULL;
