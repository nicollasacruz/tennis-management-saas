-- CreateEnum
CREATE TYPE "ClassExceptionType" AS ENUM ('CANCELLED', 'MOVED');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "classSlotId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "maxCourts" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surface" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "coachId" TEXT,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classSlotId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classSlotId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ClassExceptionType" NOT NULL,
    "newCourtId" TEXT,
    "newDate" TIMESTAMP(3),
    "newStartMin" INTEGER,
    "newEndMin" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Court_tenantId_idx" ON "Court"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Court_tenantId_name_key" ON "Court"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ClassSlot_tenantId_idx" ON "ClassSlot"("tenantId");

-- CreateIndex
CREATE INDEX "ClassSlot_courtId_idx" ON "ClassSlot"("courtId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_tenantId_idx" ON "ClassEnrollment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classSlotId_studentId_key" ON "ClassEnrollment"("classSlotId", "studentId");

-- CreateIndex
CREATE INDEX "ClassException_tenantId_idx" ON "ClassException"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassException_classSlotId_date_key" ON "ClassException"("classSlotId", "date");

-- CreateIndex
CREATE INDEX "Attendance_classSlotId_idx" ON "Attendance"("classSlotId");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classSlotId_fkey" FOREIGN KEY ("classSlotId") REFERENCES "ClassSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSlot" ADD CONSTRAINT "ClassSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSlot" ADD CONSTRAINT "ClassSlot_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSlot" ADD CONSTRAINT "ClassSlot_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "SystemUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classSlotId_fkey" FOREIGN KEY ("classSlotId") REFERENCES "ClassSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassException" ADD CONSTRAINT "ClassException_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassException" ADD CONSTRAINT "ClassException_classSlotId_fkey" FOREIGN KEY ("classSlotId") REFERENCES "ClassSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
