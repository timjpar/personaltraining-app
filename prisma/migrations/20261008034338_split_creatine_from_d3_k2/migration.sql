-- Data migration: one coach's "Creatine, D3 + K2" row split into the two
-- separate supplements it always was — creatine, and a Sports Research D3 + K2
-- softgel — so each can be ticked, logged and read on its own.
--
-- The row becomes the catalog's Creatine Monohydrate at 5 g, which carries
-- none of the tracked nutrients, and gives up the vitamin D and K that
-- 20261008013057_d3_k2_dose_for_own_plans put on it. Those move, unchanged, to
-- a new row right after it: 125 µg D3 and 100 µg K2 (MK-7) in one softgel.
-- Neither row has calories, so no plan's targets or title move.
--
-- Same safety rules as 20261008015936_chromium_molybdenum_biotin_for_own_plans:
-- owner by email, only the coach's own plans (library, or assigned to
-- themselves), matched on name AND exact amount, so a re-deploy finds no
-- combined row and does nothing. Logged days are left as they were recorded.

CREATE TEMP TABLE combined AS
SELECT f."id", f."mealId", f."order"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
JOIN "NutritionPlan" p ON p."id" = m."planId"
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = 'Creatine, D3 + K2'
  AND f."quantity" = '5 g creatine';

-- Room for the softgel straight after the creatine.
UPDATE "Food" f
SET "order" = f."order" + 1
FROM combined c
WHERE f."mealId" = c."mealId"
  AND f."order" > c."order";

UPDATE "Food" f
SET "name" = 'Creatine Monohydrate', "quantity" = '5 g', "grams" = 5, "nutrients" = NULL
FROM combined c
WHERE f."id" = c."id";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_d3k2_' || c."mealId",
  c."mealId",
  'Sports Research D3 + K2',
  '1 softgel',
  0, 0, 0, 0,
  c."order" + 1,
  NULL,
  NULL,
  '{"vitaminD":125,"vitaminK":100}'::jsonb
FROM combined c
ON CONFLICT DO NOTHING;

DROP TABLE combined;
