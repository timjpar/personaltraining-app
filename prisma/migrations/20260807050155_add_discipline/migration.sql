-- AlterTable
ALTER TABLE "TrainerExercise" ADD COLUMN     "discipline" TEXT;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "discipline" TEXT NOT NULL DEFAULT 'STRENGTH';

-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN     "discipline" TEXT NOT NULL DEFAULT 'STRENGTH';
