-- Data migration: swaps the breakfast walnuts for sunflower seeds in one
-- coach's rest-day and training-day plans, for the vitamin E.
--
-- Same reasoning and safety rules as 20260921130000_add_morning_clementine.
-- The swap is an UPDATE of the existing row, so the food keeps its place in the
-- meal; re-running finds no walnuts and does nothing. Titles and targets move
-- after it, gated on their current value, and only the coach's own copies are
-- touched.

CREATE TEMP TABLE sunflower_plans AS
SELECT p."id", p."title"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND p."title" IN ('Rest Day · 2,478 kcal', 'Training Day · 2,737 kcal');

UPDATE "Food" f
SET "name" = 'Sunflower seeds', "quantity" = '20 g',
    "calories" = 115, "protein" = 4, "carbs" = 4, "fat" = 10
FROM "Meal" m
JOIN sunflower_plans sp ON sp."id" = m."planId"
WHERE f."mealId" = m."id"
  AND m."name" = 'Breakfast'
  AND f."name" = 'Walnuts';

UPDATE "NutritionPlan" p
SET
  "title" = CASE sp."title"
    WHEN 'Rest Day · 2,478 kcal' THEN 'Rest Day · 2,493 kcal'
    ELSE 'Training Day · 2,752 kcal'
  END,
  "targetCalories" = p."targetCalories" + 15,
  "targetProtein"  = p."targetProtein" + 2,
  "targetCarbs"    = p."targetCarbs" + 2,
  "updatedAt"      = NOW()
FROM sunflower_plans sp
WHERE sp."id" = p."id"
  AND EXISTS (
    SELECT 1 FROM "Food" f
    JOIN "Meal" m ON m."id" = f."mealId"
    WHERE m."planId" = p."id" AND f."name" = 'Sunflower seeds'
  );

DROP TABLE sunflower_plans;
