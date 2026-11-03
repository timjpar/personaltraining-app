-- CreateTable
CREATE TABLE "ProgressionGoal" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "exerciseKey" TEXT NOT NULL,
    "builtinPath" TEXT,
    "customPathId" TEXT,
    "setById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionPath" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "authorId" TEXT,
    "goal" TEXT NOT NULL,
    "blurb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "how" TEXT,
    "when" TEXT,
    "targetSets" INTEGER,
    "targetReps" INTEGER,
    "targetSeconds" INTEGER,
    "weeks" TEXT,

    CONSTRAINT "ProgressionStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionGoal_athleteId_exerciseKey_key" ON "ProgressionGoal"("athleteId", "exerciseKey");

-- CreateIndex
CREATE INDEX "ProgressionPath_athleteId_idx" ON "ProgressionPath"("athleteId");

-- CreateIndex
CREATE INDEX "ProgressionStep_pathId_idx" ON "ProgressionStep"("pathId");

-- AddForeignKey
ALTER TABLE "ProgressionGoal" ADD CONSTRAINT "ProgressionGoal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionGoal" ADD CONSTRAINT "ProgressionGoal_customPathId_fkey" FOREIGN KEY ("customPathId") REFERENCES "ProgressionPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionGoal" ADD CONSTRAINT "ProgressionGoal_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionPath" ADD CONSTRAINT "ProgressionPath_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionPath" ADD CONSTRAINT "ProgressionPath_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionStep" ADD CONSTRAINT "ProgressionStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "ProgressionPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one of the two path references. Prisma can't say this in the
-- schema, and a goal pointing at both or at nothing has no reading.
ALTER TABLE "ProgressionGoal" ADD CONSTRAINT "ProgressionGoal_one_path_check" CHECK (("builtinPath" IS NULL) <> ("customPathId" IS NULL));
