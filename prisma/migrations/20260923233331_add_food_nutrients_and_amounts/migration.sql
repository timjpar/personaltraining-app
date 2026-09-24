-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "grams" DOUBLE PRECISION,
ADD COLUMN     "gramsPerCup" DOUBLE PRECISION,
ADD COLUMN     "nutrients" JSONB;

-- AlterTable
ALTER TABLE "LoggedFood" ADD COLUMN     "grams" DOUBLE PRECISION,
ADD COLUMN     "gramsPerCup" DOUBLE PRECISION,
ADD COLUMN     "nutrients" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nutrientDetail" TEXT NOT NULL DEFAULT 'OFF';
