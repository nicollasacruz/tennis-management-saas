CREATE TYPE "SystemUserRole" AS ENUM ('ADMIN', 'HEAD_COACH', 'COACH', 'FINANCE', 'DESK');

CREATE TABLE "SystemUser" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "role" "SystemUserRole" NOT NULL,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemUser_email_key" ON "SystemUser"("email");
