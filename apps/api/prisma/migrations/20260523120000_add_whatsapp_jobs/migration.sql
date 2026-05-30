CREATE TYPE "WhatsappJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "WhatsappJob" (
  "id" TEXT NOT NULL,
  "status" "WhatsappJobStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingStartedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappJob_status_scheduledAt_idx" ON "WhatsappJob"("status", "scheduledAt");
CREATE INDEX "WhatsappJob_referenceType_referenceId_idx" ON "WhatsappJob"("referenceType", "referenceId");
