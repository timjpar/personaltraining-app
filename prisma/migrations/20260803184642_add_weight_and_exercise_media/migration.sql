-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "weight" TEXT;

-- AlterTable
ALTER TABLE "TemplateExercise" ADD COLUMN     "weight" TEXT;

-- AlterTable
ALTER TABLE "TrainerExercise" ADD COLUMN     "mediaKind" TEXT,
ADD COLUMN     "mediaUrl" TEXT;
