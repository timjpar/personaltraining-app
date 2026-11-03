-- Data migration: undo 20261103230000_rest_day_shake_is_pre_workout, and give
-- one coach a Rest Day plan again.
--
-- That migration assumed the "Protein shake" meal belonged to a Rest Day
-- plan. The coach no longer had one: the meal it renamed was the shake in
-- their own Training Day. It goes back to "Protein shake", in their own plans
-- and in their log from 2026-11-03 on, the same rows the rename touched.
--
-- Then the coach asked for Rest Day back. Rest Day has matched Training Day
-- food for food since 20261027213345_same_day_every_day_shake_with_oat_milk_banana,
-- so it is rebuilt as a copy of the library's Training Day: every meal and
-- food, micronutrients, groups and notes included, titled "Rest Day · N kcal".
-- It goes in the library only, unassigned. A library plan already called
-- Rest Day (cut versions aside) means nothing is copied, so a re-deploy does
-- nothing.

UPDATE "Meal" m
SET "name" = 'Protein shake'
FROM "NutritionPlan" p, "User" u
WHERE p."id" = m."planId"
  AND u."id" = p."trainerId"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND m."name" = 'Pre-workout'
  AND EXISTS (SELECT 1 FROM "Food" f WHERE f."mealId" = m."id" AND f."name" ILIKE '%whey%')
  AND NOT EXISTS (SELECT 1 FROM "Meal" o WHERE o."planId" = m."planId" AND o."name" = 'Protein shake');

UPDATE "LoggedFood" lf
SET "meal" = 'Protein shake'
FROM "NutritionLog" l, "User" u
WHERE l."id" = lf."logId"
  AND u."id" = l."clientId"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND l."date" >= '2026-11-03'
  AND lf."meal" = 'Pre-workout'
  AND NOT EXISTS (SELECT 1 FROM "LoggedFood" o WHERE o."logId" = lf."logId" AND o."meal" = 'Protein shake');

CREATE TEMP TABLE source AS
SELECT p."id", 'nplan_rest_restored_' || p."id" AS "newId"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND p."clientId" IS NULL
  AND p."title" ILIKE 'Training Day%'
  AND p."title" NOT ILIKE '%cut%'
  AND NOT EXISTS (
    SELECT 1 FROM "NutritionPlan" r
    WHERE r."trainerId" = p."trainerId"
      AND r."clientId" IS NULL
      AND r."title" ILIKE 'Rest Day%'
      AND r."title" NOT ILIKE '%cut%'
  )
ORDER BY p."updatedAt" DESC
LIMIT 1;

INSERT INTO "NutritionPlan" ("id", "title", "notes", "targetCalories", "targetProtein", "targetCarbs", "targetFat", "createdAt", "updatedAt", "trainerId", "clientId", "sourceId")
SELECT s."newId", regexp_replace(p."title", '^Training Day', 'Rest Day'), p."notes",
  p."targetCalories", p."targetProtein", p."targetCarbs", p."targetFat",
  NOW(), NOW(), p."trainerId", NULL, NULL
FROM source s
JOIN "NutritionPlan" p ON p."id" = s."id"
ON CONFLICT DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'rest_restored_' || m."id", s."newId", m."name", m."notes", m."order"
FROM source s
JOIN "Meal" m ON m."planId" = s."id"
ON CONFLICT DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients", "groupName")
SELECT 'rest_restored_' || f."id", 'rest_restored_' || m."id", f."name", f."quantity",
  f."calories", f."protein", f."carbs", f."fat", f."order", f."grams", f."gramsPerCup", f."nutrients", f."groupName"
FROM source s
JOIN "Meal" m ON m."planId" = s."id"
JOIN "Food" f ON f."mealId" = m."id"
ON CONFLICT DO NOTHING;

DROP TABLE source;
