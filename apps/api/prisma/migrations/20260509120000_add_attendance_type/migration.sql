-- Create the new enum
CREATE TYPE "AttendanceType" AS ENUM ('TENNIS', 'PHYSICAL');

-- Add the type column with default TENNIS (all existing presences become TENNIS)
ALTER TABLE "Attendance" ADD COLUMN "type" "AttendanceType" NOT NULL DEFAULT 'TENNIS';

-- Find and drop the old unique constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'Attendance'
      AND con.contype = 'u'
      AND con.conkey @> (
          SELECT array_agg(att.attnum)
          FROM pg_attribute att
          JOIN pg_class rel2 ON rel2.oid = att.attrelid
          WHERE rel2.relname = 'Attendance'
            AND att.attname IN ('studentId', 'attendanceDate')
      )
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "Attendance" DROP CONSTRAINT "' || constraint_name || '"';
    END IF;
END;
$$;

-- Create the new unique constraint
CREATE UNIQUE INDEX "Attendance_studentId_attendanceDate_type_key" ON "Attendance"("studentId", "attendanceDate", "type");
