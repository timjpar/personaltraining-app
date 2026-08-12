-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "SessionCredit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "workoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionCredit_workoutId_key" ON "SessionCredit"("workoutId");

-- CreateIndex
CREATE INDEX "SessionCredit_clientId_createdAt_idx" ON "SessionCredit"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "SessionCredit" ADD CONSTRAINT "SessionCredit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCredit" ADD CONSTRAINT "SessionCredit_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCredit" ADD CONSTRAINT "SessionCredit_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
