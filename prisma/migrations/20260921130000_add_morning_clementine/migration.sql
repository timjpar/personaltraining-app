-- Data migration: adds a clementine to breakfast in one coach's rest-day and
-- training-day plans, and moves each plan's title and targets up by it.
--
-- Same reasoning and safety rules as 20260921120000_add_rest_day_nutrition_plan.
-- Plans are matched by their current title, so the insert runs before the
-- rename and a re-deploy finds nothing to match. Only the coach's own copies
-- are touched (library, or assigned to themselves) — never a plan they handed
-- to a client. A plan renamed in the app since is left alone.

CREATE TEMP TABLE clementine_plans AS
SELECT p."id", p."title"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND p."title" IN ('Rest Day · 2,443 kcal', 'Training Day · 2,702 kcal');

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT
  'food_clem_' || m."id",
  m."id",
  'Clementine',
  '1 medium (74 g)',
  35, 1, 9, 0,
  COALESCE((SELECT max(f."order") FROM "Food" f WHERE f."mealId" = m."id"), 0) + 1
FROM "Meal" m
JOIN clementine_plans cp ON cp."id" = m."planId"
WHERE m."name" = 'Breakfast'
ON CONFLICT DO NOTHING;

UPDATE "NutritionPlan" p
SET
  "title" = CASE cp."title"
    WHEN 'Rest Day · 2,443 kcal' THEN 'Rest Day · 2,478 kcal'
    ELSE 'Training Day · 2,737 kcal'
  END,
  "targetCalories" = p."targetCalories" + 35,
  "targetProtein"  = p."targetProtein" + 1,
  "targetCarbs"    = p."targetCarbs" + 9,
  "updatedAt"      = NOW()
FROM clementine_plans cp
WHERE cp."id" = p."id"
  AND EXISTS (SELECT 1 FROM "Food" f WHERE f."id" LIKE 'food_clem_%' AND f."mealId" IN (SELECT m."id" FROM "Meal" m WHERE m."planId" = p."id"));

DROP TABLE clementine_plans;
