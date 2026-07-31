// Demo data so a fresh clone has something to look at.
// Run with: npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeExerciseName } from "../src/lib/exercise-presets";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

const adapter = new PrismaPg({ connectionString });
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
          { order: 1, section: "WARMUP", name: "Bike Easy", sets: "1", reps: "5 min" },
          { order: 2, section: "WARMUP", name: "World's Greatest Stretch", sets: "2", reps: "5/side" },
          { order: 3, section: "WARMUP", name: "Banded Monster Walk", sets: "2", reps: "10/way" },
          { order: 4, name: "Back Squat", sets: "4", reps: "5", load: "70%", tempo: "31X1", rest: "2:30", notes: "Leave one rep in the tank on the top set." },
          { order: 5, name: "Romanian Deadlift", sets: "3", reps: "8", load: "RPE 7", rest: "2:00" },
          { order: 6, name: "Walking Lunge", sets: "3", reps: "10/leg", load: "2x20kg", rest: "90s" },
          { order: 7, name: "Hanging Knee Raise", sets: "3", reps: "12", tempo: "20X0", rest: "60s" },
          { order: 8, section: "COOLDOWN", name: "Couch Stretch", sets: "2", reps: "60s/side" },
          { order: 9, section: "COOLDOWN", name: "Foam Roll Quads", sets: "1", reps: "2 min" },
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
          { order: 3, name: "Dumbbell Shoulder Press", sets: "3", reps: "10", load: "18kg", rest: "90s", resultReps: "10,10,10", resultLoad: "18kg", done: true },
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
          { order: 3, name: "Dumbbell Row", sets: "3", reps: "10/side", load: "22kg", rest: "90s" },
        ],
      },
    },
  });

  // --- Reusable library: workout templates, a program, a nutrition plan ---
  // Idempotent reset of the trainer's library (leaves assigned client copies).
  await prisma.program.deleteMany({ where: { trainerId: trainer.id } });
  await prisma.workoutTemplate.deleteMany({ where: { trainerId: trainer.id } });
  await prisma.nutritionPlan.deleteMany({
    where: { trainerId: trainer.id, clientId: null },
  });

  const lower = await prisma.workoutTemplate.create({
    data: {
      title: "Lower Body A",
      notes: "Strength focus. Warm up thoroughly.",
      trainerId: trainer.id,
      exercises: {
        create: [
          { order: 1, section: "WARMUP", name: "Bike Easy", sets: "1", reps: "5 min" },
          { order: 2, section: "WARMUP", name: "Banded Glute Bridge", sets: "2", reps: "12" },
          { order: 3, name: "Back Squat", sets: "4", reps: "5", load: "70%", tempo: "31X1", rest: "2:30" },
          { order: 4, name: "Romanian Deadlift", sets: "3", reps: "8", load: "RPE 7", rest: "2:00" },
          { order: 5, name: "Walking Lunge", sets: "3", reps: "10/leg", rest: "90s" },
          { order: 6, section: "COOLDOWN", name: "Couch Stretch", sets: "2", reps: "60s/side" },
        ],
      },
    },
  });

  const upper = await prisma.workoutTemplate.create({
    data: {
      title: "Upper Body A",
      notes: "Press focus.",
      trainerId: trainer.id,
      exercises: {
        create: [
          { order: 1, name: "Bench Press", sets: "4", reps: "6", load: "72.5%", tempo: "21X1", rest: "2:30" },
          { order: 2, name: "Chin-Up", sets: "3", reps: "8", load: "bodyweight", rest: "2:00" },
          { order: 3, name: "Dumbbell Shoulder Press", sets: "3", reps: "10", rest: "90s" },
        ],
      },
    },
  });

  const fullBody = await prisma.workoutTemplate.create({
    data: {
      title: "Full Body Primer",
      trainerId: trainer.id,
      exercises: {
        create: [
          { order: 1, name: "Goblet Squat", sets: "3", reps: "12", rest: "90s" },
          { order: 2, name: "Push-Up", sets: "3", reps: "AMRAP", rest: "90s" },
          { order: 3, name: "Dumbbell Row", sets: "3", reps: "10/side", rest: "90s" },
        ],
      },
    },
  });

  // --- The trainer's exercise catalog ---
  // Normally written automatically as sessions are saved; seeded here so the
  // picker's "Recent" and "My exercises" groups aren't empty on a fresh clone.
  await prisma.trainerExercise.deleteMany({ where: { trainerId: trainer.id } });
  await prisma.trainerExercise.createMany({
    data: [
      // Presets that the seeded sessions use — these feed "Recent" only.
      "Back Squat",
      "Romanian Deadlift",
      "Walking Lunge",
      "Bench Press",
      "Chin-Up",
      "Dumbbell Shoulder Press",
      "Goblet Squat",
      "Bike Easy",
      "Couch Stretch",
      // Not in the shipped list, so these are what "My exercises" shows.
      "Belt Squat March",
      "Alex's Hip Airplane",
    ].map((name, i) => ({
      trainerId: trainer.id,
      name,
      nameKey: normalizeExerciseName(name),
      // Stagger so "Recent" has a believable order rather than ties.
      lastUsedAt: new Date(Date.now() - i * 60_000),
    })),
  });

  await prisma.program.create({
    data: {
      title: "2-Week Base",
      notes: "Alternating lower/upper with a full-body primer on Fridays.",
      weeks: 2,
      trainerId: trainer.id,
      slots: {
        create: [
          { week: 1, day: 1, templateId: lower.id },
          { week: 1, day: 3, templateId: upper.id },
          { week: 1, day: 5, templateId: fullBody.id },
          { week: 2, day: 1, templateId: lower.id },
          { week: 2, day: 3, templateId: upper.id },
          { week: 2, day: 5, templateId: fullBody.id },
        ],
      },
    },
  });

  await prisma.nutritionPlan.create({
    data: {
      title: "Cut · 2,000 kcal",
      notes: "Hit protein first. Veg with every meal. Water 3L/day.",
      targetCalories: 2000,
      targetProtein: 170,
      targetCarbs: 180,
      targetFat: 60,
      trainerId: trainer.id,
      clientId: null,
      meals: {
        create: [
          {
            name: "Breakfast",
            order: 1,
            foods: {
              create: [
                { order: 1, name: "Greek yogurt", quantity: "200 g", calories: 130, protein: 20, carbs: 8, fat: 0 },
                { order: 2, name: "Berries", quantity: "1 cup", calories: 80, protein: 1, carbs: 20, fat: 0 },
                { order: 3, name: "Almonds", quantity: "20 g", calories: 120, protein: 4, carbs: 4, fat: 11 },
              ],
            },
          },
          {
            name: "Lunch",
            order: 2,
            foods: {
              create: [
                { order: 1, name: "Chicken breast", quantity: "180 g", calories: 300, protein: 56, carbs: 0, fat: 7 },
                { order: 2, name: "Rice", quantity: "1 cup cooked", calories: 205, protein: 4, carbs: 45, fat: 0 },
                { order: 3, name: "Mixed veg", quantity: "2 cups", calories: 80, protein: 4, carbs: 16, fat: 1 },
              ],
            },
          },
          {
            name: "Dinner",
            order: 3,
            foods: {
              create: [
                { order: 1, name: "Salmon", quantity: "150 g", calories: 280, protein: 34, carbs: 0, fat: 16 },
                { order: 2, name: "Potato", quantity: "200 g", calories: 160, protein: 4, carbs: 36, fat: 0 },
                { order: 3, name: "Salad + olive oil", quantity: "1 bowl", calories: 120, protein: 2, carbs: 8, fat: 10 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seeded:");
  console.log("  Trainer  alex@chalkline.dev / trainpass123");
  console.log("  Client   maria@example.com / clientpass123");
  console.log("  Client   jordan@example.com / clientpass123");
  console.log("  Library  3 workouts · 1 program · 1 nutrition plan");
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
