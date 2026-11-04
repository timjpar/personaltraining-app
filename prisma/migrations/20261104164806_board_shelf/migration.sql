-- AlterTable
ALTER TABLE "User" ADD COLUMN     "boardShelf" TEXT[] DEFAULT ARRAY[]::TEXT[];
