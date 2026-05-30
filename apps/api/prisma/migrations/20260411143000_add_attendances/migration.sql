CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "attendanceDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attendance_studentId_attendanceDate_key"
ON "Attendance"("studentId", "attendanceDate");

CREATE INDEX "Attendance_attendanceDate_idx"
ON "Attendance"("attendanceDate");

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
