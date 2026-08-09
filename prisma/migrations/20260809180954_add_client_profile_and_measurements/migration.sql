-- AlterTable
ALTER TABLE "User" ADD COLUMN     "units" TEXT NOT NULL DEFAULT 'METRIC';

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" TIMESTAMP(3),
    "heightCm" DOUBLE PRECISION,
    "activityLevel" TEXT,
    "goalType" TEXT,
    "goalWeightKg" DOUBLE PRECISION,
    "rateKgPerWeek" DOUBLE PRECISION,
    "trainingDaysPerWeek" INTEGER,
    "experience" TEXT,
    "trainingLocation" TEXT,
    "equipmentNotes" TEXT,
    "injuries" TEXT,
    "dietPattern" TEXT,
    "allergies" TEXT,
    "dietaryNotes" TEXT,
    "mealsPerDay" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "neckCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "armCm" DOUBLE PRECISION,
    "calfCm" DOUBLE PRECISION,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'TRAINER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_clientId_date_key" ON "Measurement"("clientId", "date");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
