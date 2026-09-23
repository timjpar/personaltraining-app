-- Data migration: adds a carrot alongside the burritos in one coach's rest-day
-- and training-day plans, for the vitamin A.
--
-- Same reasoning and safety rules as 20260923120000_swap_walnuts_for_sunflower_seeds:
-- fixed id, plans matched by their current title so the rename makes a re-deploy
-- a no-op, and only the coach's own copies are touched.

CREATE TEMP TABLE carrot_plans AS
SELECT p."id", p."title"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND p."title" IN ('Rest Day · 2,493 kcal', 'Training Day · 2,752 kcal');

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT
  'food_carrot_' || m."id",
  m."id",
  'Carrot',
  '1 medium (61 g)',
  25, 1, 6, 0,
  COALESCE((SELECT max(f."order") FROM "Food" f WHERE f."mealId" = m."id"), 0) + 1
FROM "Meal" m
JOIN carrot_plans cp ON cp."id" = m."planId"
WHERE m."name" = 'Burrito ×2'
ON CONFLICT DO NOTHING;

UPDATE "NutritionPlan" p
SET
  "title" = CASE cp."title"
    WHEN 'Rest Day · 2,493 kcal' THEN 'Rest Day · 2,518 kcal'
    ELSE 'Training Day · 2,777 kcal'
  END,
  "targetCalories" = p."targetCalories" + 25,
  "targetProtein"  = p."targetProtein" + 1,
  "targetCarbs"    = p."targetCarbs" + 6,
  "updatedAt"      = NOW()
FROM carrot_plans cp
WHERE cp."id" = p."id"
  AND EXISTS (
    SELECT 1 FROM "Food" f
    JOIN "Meal" m ON m."id" = f."mealId"
    WHERE m."planId" = p."id" AND f."name" = 'Carrot'
  );

DROP TABLE carrot_plans;
