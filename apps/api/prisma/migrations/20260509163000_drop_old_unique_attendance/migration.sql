-- Prisma cria @@unique como UNIQUE INDEX, não como CONSTRAINT
DROP INDEX IF EXISTS "Attendance_studentId_attendanceDate_key";
