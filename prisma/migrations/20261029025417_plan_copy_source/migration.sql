-- AlterTable
ALTER TABLE "NutritionPlan" ADD COLUMN     "sourceId" TEXT;

-- CreateIndex
CREATE INDEX "NutritionPlan_sourceId_idx" ON "NutritionPlan"("sourceId");

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NutritionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
