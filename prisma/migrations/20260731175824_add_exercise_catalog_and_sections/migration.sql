-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "section" TEXT NOT NULL DEFAULT 'MAIN';

-- AlterTable
ALTER TABLE "TemplateExercise" ADD COLUMN     "section" TEXT NOT NULL DEFAULT 'MAIN';

-- CreateTable
CREATE TABLE "TrainerExercise" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerExercise_trainerId_lastUsedAt_idx" ON "TrainerExercise"("trainerId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerExercise_trainerId_nameKey_key" ON "TrainerExercise"("trainerId", "nameKey");

-- AddForeignKey
ALTER TABLE "TrainerExercise" ADD CONSTRAINT "TrainerExercise_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
