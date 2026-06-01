-- Fase 2 multitenant: isolar modelos de negocio por tenant + config WhatsApp por tenant.
-- Backfill assume que todos os registos existentes pertencem ao tenant inicial 'tenant_esaf'
-- (criado na migracao 20260531100000_add_tenant_foundation).

-- CreateEnum
CREATE TYPE "WhatsappConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED');

-- AlterTable Plan
ALTER TABLE "Plan" ADD COLUMN "tenantId" TEXT;
UPDATE "Plan" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "Plan" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable Student
ALTER TABLE "Student" ADD COLUMN "tenantId" TEXT;
UPDATE "Student" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "Student" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable Payment
ALTER TABLE "Payment" ADD COLUMN "tenantId" TEXT;
UPDATE "Payment" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "Payment" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable Receipt
ALTER TABLE "Receipt" ADD COLUMN "tenantId" TEXT;
UPDATE "Receipt" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "Receipt" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable Attendance
ALTER TABLE "Attendance" ADD COLUMN "tenantId" TEXT;
UPDATE "Attendance" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "Attendance" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable Activity
ALTER TABLE "Activity" ADD COLUMN "tenantId" TEXT;
UPDATE "Activity" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "Activity" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable StudentStatusHistory
ALTER TABLE "StudentStatusHistory" ADD COLUMN "tenantId" TEXT;
UPDATE "StudentStatusHistory" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "StudentStatusHistory" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable EmailJob
ALTER TABLE "EmailJob" ADD COLUMN "tenantId" TEXT;
UPDATE "EmailJob" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "EmailJob" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable WhatsappJob
ALTER TABLE "WhatsappJob" ADD COLUMN "tenantId" TEXT;
UPDATE "WhatsappJob" SET "tenantId" = 'tenant_esaf' WHERE "tenantId" IS NULL;
ALTER TABLE "WhatsappJob" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateTable TenantWhatsappConfig
CREATE TABLE "TenantWhatsappConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT,
    "instanceToken" TEXT,
    "instanceName" TEXT,
    "phoneNumber" TEXT,
    "status" "WhatsappConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantWhatsappConfig_pkey" PRIMARY KEY ("id")
);

-- Indexes / uniques: Plan
DROP INDEX "Plan_name_key";
CREATE INDEX "Plan_tenantId_idx" ON "Plan"("tenantId");
CREATE UNIQUE INDEX "Plan_tenantId_name_key" ON "Plan"("tenantId", "name");

-- Indexes / uniques: Student
DROP INDEX "Student_email_key";
CREATE INDEX "Student_tenantId_idx" ON "Student"("tenantId");
CREATE UNIQUE INDEX "Student_tenantId_email_key" ON "Student"("tenantId", "email");

-- Indexes: Payment
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- Indexes / uniques: Receipt
DROP INDEX "Receipt_number_key";
CREATE INDEX "Receipt_tenantId_idx" ON "Receipt"("tenantId");
CREATE UNIQUE INDEX "Receipt_tenantId_number_key" ON "Receipt"("tenantId", "number");

-- Indexes: Attendance
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");

-- Indexes: Activity
CREATE INDEX "Activity_tenantId_idx" ON "Activity"("tenantId");

-- Indexes: StudentStatusHistory
CREATE INDEX "StudentStatusHistory_tenantId_idx" ON "StudentStatusHistory"("tenantId");

-- Indexes: EmailJob
CREATE INDEX "EmailJob_tenantId_status_scheduledAt_idx" ON "EmailJob"("tenantId", "status", "scheduledAt");

-- Indexes: WhatsappJob
CREATE INDEX "WhatsappJob_tenantId_status_scheduledAt_idx" ON "WhatsappJob"("tenantId", "status", "scheduledAt");

-- Unique: TenantWhatsappConfig
CREATE UNIQUE INDEX "TenantWhatsappConfig_tenantId_key" ON "TenantWhatsappConfig"("tenantId");

-- ForeignKeys
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentStatusHistory" ADD CONSTRAINT "StudentStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsappJob" ADD CONSTRAINT "WhatsappJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantWhatsappConfig" ADD CONSTRAINT "TenantWhatsappConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
