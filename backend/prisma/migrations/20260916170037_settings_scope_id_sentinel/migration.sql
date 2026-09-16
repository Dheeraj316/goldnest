/*
  Warnings:

  - Made the column `scope_id` on table `settings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "scope_id" SET NOT NULL,
ALTER COLUMN "scope_id" SET DEFAULT '00000000-0000-0000-0000-000000000000';
