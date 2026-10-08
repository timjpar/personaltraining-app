-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "cardioMinutesPerWeek" INTEGER,
ADD COLUMN     "dailySteps" INTEGER,
ADD COLUMN     "goalBodyFatPct" DOUBLE PRECISION,
ADD COLUMN     "goalDate" TIMESTAMP(3),
ADD COLUMN     "goalFocus" TEXT,
ADD COLUMN     "goalNotes" TEXT,
ADD COLUMN     "goalWaistCm" DOUBLE PRECISION,
ADD COLUMN     "occupationActivity" TEXT,
ADD COLUMN     "sessionMinutes" INTEGER;
