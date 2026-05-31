-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIALING', 'SUSPENDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryHost" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "receiptIssuer" TEXT,
    "receiptSignatureLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_primaryHost_key" ON "Tenant"("primaryHost");

-- Seed tenant inicial para preservar dados existentes.
INSERT INTO "Tenant" (
    "id",
    "name",
    "slug",
    "primaryHost",
    "status",
    "receiptIssuer",
    "receiptSignatureLabel",
    "createdAt",
    "updatedAt"
)
VALUES (
    'tenant_esaf',
    'ESAF - Escola de Tenis',
    'esaf',
    'esaf.tenis.esaf.run.place',
    'ACTIVE',
    'ESAF - Escola de Tenis',
    'Direcao ESAF',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- AlterTable
ALTER TABLE "SystemUser" ADD COLUMN "tenantId" TEXT;

-- Backfill
UPDATE "SystemUser"
SET "tenantId" = 'tenant_esaf'
WHERE "tenantId" IS NULL;

-- AlterTable
ALTER TABLE "SystemUser" ALTER COLUMN "tenantId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "SystemUser_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "SystemUser_tenantId_email_key" ON "SystemUser"("tenantId", "email");

-- CreateIndex
CREATE INDEX "SystemUser_tenantId_idx" ON "SystemUser"("tenantId");

-- AddForeignKey
ALTER TABLE "SystemUser" ADD CONSTRAINT "SystemUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
