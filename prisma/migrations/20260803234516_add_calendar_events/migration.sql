-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "startMinute" INTEGER;

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'SESSION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_trainerId_date_idx" ON "CalendarEvent"("trainerId", "date");

-- CreateIndex
CREATE INDEX "CalendarEvent_clientId_idx" ON "CalendarEvent"("clientId");

-- CreateIndex
CREATE INDEX "Workout_trainerId_scheduledDate_idx" ON "Workout"("trainerId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
