-- Data migration: the whey shake in one coach's rest-day plans is called
-- "Pre-workout", like the training day's, now that all the blueberries sit in
-- it (20261103220000_berries_at_the_shake_banana_in_the_smoothie). The coach
-- asked for the rest day's blueberries to be "in pre-workout" too.
--
-- Only a meal named "Protein shake" that holds the whey, in the coach's own
-- plans (library, or assigned to themselves), found by email, and only where
-- the plan has no "Pre-workout" meal already. Log check-offs match on meal
-- name, so the same rename is applied to that day's log from 2026-11-03 on,
-- keeping today's ticks on their rows; earlier days stay as they were logged.

UPDATE "Meal" m
SET "name" = 'Pre-workout'
FROM "NutritionPlan" p, "User" u
WHERE p."id" = m."planId"
  AND u."id" = p."trainerId"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND m."name" = 'Protein shake'
  AND EXISTS (SELECT 1 FROM "Food" f WHERE f."mealId" = m."id" AND f."name" ILIKE '%whey%')
  AND NOT EXISTS (SELECT 1 FROM "Meal" o WHERE o."planId" = m."planId" AND o."name" = 'Pre-workout');

UPDATE "LoggedFood" lf
SET "meal" = 'Pre-workout'
FROM "NutritionLog" l, "User" u
WHERE l."id" = lf."logId"
  AND u."id" = l."clientId"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND l."date" >= '2026-11-03'
  AND lf."meal" = 'Protein shake'
  AND NOT EXISTS (SELECT 1 FROM "LoggedFood" o WHERE o."logId" = lf."logId" AND o."meal" = 'Pre-workout');
