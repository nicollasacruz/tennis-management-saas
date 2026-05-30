DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'StudentSex'
  ) THEN
    CREATE TYPE "StudentSex" AS ENUM ('FEMALE', 'MALE', 'OTHER');
  END IF;
END $$;

ALTER TABLE "Student"
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "doesPhysicalTraining" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "licenseNumber" VARCHAR(50),
ADD COLUMN "sex" "StudentSex";
