CREATE TABLE "StudentStatusHistory" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentStatusHistory_studentId_startedAt_idx"
ON "StudentStatusHistory"("studentId", "startedAt");

ALTER TABLE "StudentStatusHistory"
ADD CONSTRAINT "StudentStatusHistory_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

INSERT INTO "StudentStatusHistory" (
  "id",
  "studentId",
  "isActive",
  "startedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || "id"),
  "id",
  "isActive",
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Student"
WHERE NOT EXISTS (
  SELECT 1
  FROM "StudentStatusHistory"
  WHERE "StudentStatusHistory"."studentId" = "Student"."id"
);
