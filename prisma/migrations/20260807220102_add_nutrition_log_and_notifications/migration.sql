-- AlterTable
ALTER TABLE "FeedItem" ADD COLUMN     "nutritionLogId" TEXT,
ALTER COLUMN "workoutId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "digestHour" INTEGER DEFAULT 20,
ADD COLUMN     "instantWorkoutEmail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedFood" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "meal" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "LoggedFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestRun" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "workouts" INTEGER NOT NULL DEFAULT 0,
    "logs" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DigestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionLog_clientId_updatedAt_idx" ON "NutritionLog"("clientId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionLog_clientId_date_key" ON "NutritionLog"("clientId", "date");

-- CreateIndex
CREATE INDEX "DigestRun_trainerId_claimedAt_idx" ON "DigestRun"("trainerId", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigestRun_trainerId_day_key" ON "DigestRun"("trainerId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "FeedItem_nutritionLogId_key" ON "FeedItem"("nutritionLogId");

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_nutritionLogId_fkey" FOREIGN KEY ("nutritionLogId") REFERENCES "NutritionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedFood" ADD CONSTRAINT "LoggedFood_logId_fkey" FOREIGN KEY ("logId") REFERENCES "NutritionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRun" ADD CONSTRAINT "DigestRun_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
