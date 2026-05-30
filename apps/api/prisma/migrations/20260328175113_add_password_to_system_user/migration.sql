/*
  Warnings:

  - Added the required column `password` to the `SystemUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SystemUser" ADD COLUMN     "password" TEXT NOT NULL;
