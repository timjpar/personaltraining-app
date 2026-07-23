// Demo data so a fresh clone has something to look at.
// Run with: npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function daysFromNow(n: number) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const trainer = await prisma.user.upsert({
    where: { email: "alex@chalkline.dev" },
    update: {},
    create: {
      email: "alex@chalkline.dev",
      name: "Alex Rivera",
      role: "TRAINER",
      passwordHash: bcrypt.hashSync("trainpass123", 10),
    },
  });

  const maria = await prisma.user.upsert({
    where: { email: "maria@example.com" },
    update: { trainerId: trainer.id },
    create: {
      email: "maria@example.com",
      name: "Maria Lopez",
      role: "CLIENT",
      trainerId: trainer.id,
      passwordHash: bcrypt.hashSync("clientpass123", 10),
    },
  });

  const jordan = await prisma.user.upsert({
    where: { email: "jordan@example.com" },
    update: { trainerId: trainer.id },
    create: {
      email: "jordan@example.com",
      name: "Jordan Beck",
      role: "CLIENT",
      trainerId: trainer.id,
      passwordHash: bcrypt.hashSync("clientpass123", 10),
    },
  });

  // Reset demo clients' workouts for idempotency.
  await prisma.feedItem.deleteMany({
    where: { clientId: { in: [maria.id, jordan.id] } },
  });
  await prisma.workout.deleteMany({
    where: { clientId: { in: [maria.id, jordan.id] } },
  });

  // Upcoming session for Maria.
  await prisma.workout.create({
    data: {
      title: "Lower Body A",
      notes: "Warm up thoroughly. Quality over load today.",
      scheduledDate: daysFromNow(1),
      status: "ASSIGNED",
      clientId: maria.id,
      trainerId: trainer.id,
      exercises: {
        create: [
          { order: 1, name: "Back Squat", sets: "4", reps: "5", load: "70%", tempo: "31X1", rest: "2:30", notes: "Leave one rep in the tank on the top set." },
          { order: 2, name: "Romanian Deadlift", sets: "3", reps: "8", load: "RPE 7", rest: "2:00" },
          { order: 3, name: "Walking Lunge", sets: "3", reps: "10/leg", load: "2x20kg", rest: "90s" },
          { order: 4, name: "Hanging Knee Raise", sets: "3", reps: "12", tempo: "20X0", rest: "60s" },
        ],
      },
    },
  });

  // A completed session for Maria, with a feed item for the trainer.
  const done = await prisma.workout.create({
    data: {
      title: "Upper Body A",
      notes: "Press focus.",
      scheduledDate: daysFromNow(-1),
      status: "COMPLETED",
      completedAt: new Date(),
      rpe: 8,
      clientComment: "Bench felt heavy but moved well. Right shoulder a little cranky on the last set.",
      clientId: maria.id,
      trainerId: trainer.id,
      exercises: {
        create: [
          { order: 1, name: "Bench Press", sets: "4", reps: "6", load: "72.5%", tempo: "21X1", rest: "2:30", resultReps: "6,6,6,5", resultLoad: "65kg", done: true },
          { order: 2, name: "Chin-Up", sets: "3", reps: "8", load: "bodyweight", rest: "2:00", resultReps: "8,8,7", done: true },
          { order: 3, name: "DB Shoulder Press", sets: "3", reps: "10", load: "18kg", rest: "90s", resultReps: "10,10,10", resultLoad: "18kg", done: true },
        ],
      },
    },
  });

  await prisma.feedItem.create({
    data: {
      type: "WORKOUT_COMPLETED",
      trainerId: trainer.id,
      clientId: maria.id,
      workoutId: done.id,
    },
  });

  // Upcoming session for Jordan.
  await prisma.workout.create({
    data: {
      title: "Full Body Primer",
      scheduledDate: daysFromNow(2),
      status: "ASSIGNED",
      clientId: jordan.id,
      trainerId: trainer.id,
      exercises: {
        create: [
          { order: 1, name: "Goblet Squat", sets: "3", reps: "12", load: "24kg", rest: "90s" },
          { order: 2, name: "Push-Up", sets: "3", reps: "AMRAP", rest: "90s", notes: "Stop 2 reps shy of failure." },
          { order: 3, name: "DB Row", sets: "3", reps: "10/side", load: "22kg", rest: "90s" },
        ],
      },
    },
  });

  console.log("Seeded:");
  console.log("  Trainer  alex@chalkline.dev / trainpass123");
  console.log("  Client   maria@example.com / clientpass123");
  console.log("  Client   jordan@example.com / clientpass123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
