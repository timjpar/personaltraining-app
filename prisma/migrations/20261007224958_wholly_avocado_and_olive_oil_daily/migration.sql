-- Data migration: one Wholly smashed avocado mini and a tablespoon of olive oil
-- in every one of one coach's own meal plans, so both are eaten every day.
--
-- Same reasoning and safety rules as 20260923233400_backfill_training_day_nutrients:
-- the owner is found by email, so any other database matches nothing; only the
-- coach's own plans (library, or assigned to themselves) are touched, never a
-- plan handed to a client.
--
--   1. A whole avocado becomes one mini, updated in place so it keeps its spot
--      in the meal.
--   2. A plan still without a mini gets one at the end of breakfast.
--   3. A plan without olive oil gets the catalog's 1 tbsp at the end of
--      breakfast, stored exactly as the builder would save it.
--   4. Each plan's targets, and the kcal in its title, are reset to what its
--      foods add up to. They had drifted where the plan was edited in the app.
--
-- The mini's numbers are the Wholly "Nothing Added" label (one 57 g cup: 130
-- kcal, 1 g protein, 5 g carbs, 11 g fat; fibre 3 g, sugar 0 g, saturated fat
-- 2 g, sodium 5 mg, potassium 280 mg). The label lists Hass avocado as the only
-- ingredient, so every nutrient it doesn't print is USDA 171706 (Hass avocado)
-- scaled to 57 g. gramsPerCup is USDA's 230 g for a cup of puréed avocado.
--
-- Every step is guarded by the state it produces, so a re-deploy is a no-op.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

-- Where a plan's added foods go: its breakfast, or its first meal if it has none.
CREATE TEMP TABLE breakfast AS
SELECT DISTINCT ON (m."planId") m."planId", m."id" AS "mealId"
FROM "Meal" m
WHERE m."planId" IN (SELECT "id" FROM own_plans)
ORDER BY m."planId", (m."name" = 'Breakfast') DESC, m."order", m."id";

UPDATE "Food" f
SET
  "name" = 'Wholly smashed avocado (nothing added)',
  "quantity" = '1 mini (57 g)',
  "calories" = 130, "protein" = 1, "carbs" = 5, "fat" = 11,
  "grams" = 57,
  "gramsPerCup" = 230,
  "nutrients" = '{"fiber":3,"sugar":0,"satFat":2,"monoFat":5.59,"polyFat":1.04,"cholesterol":0,"sodium":5,"potassium":280,"calcium":7.41,"iron":0.35,"magnesium":16.53,"zinc":0.39,"phosphorus":30.78,"copper":0.1,"manganese":0.08,"selenium":0.23,"vitaminA":3.99,"vitaminC":5.02,"vitaminD":0,"vitaminE":1.12,"vitaminK":11.97,"thiamin":0.04,"riboflavin":0.08,"niacin":1.09,"pantothenicAcid":0.83,"vitaminB6":0.16,"folate":50.73,"vitaminB12":0,"choline":8.09}'::jsonb
FROM "Meal" m
WHERE f."mealId" = m."id"
  AND m."planId" IN (SELECT "id" FROM own_plans)
  AND lower(btrim(f."name")) IN ('avocado', 'avocados');

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_wholly_' || b."mealId",
  b."mealId",
  'Wholly smashed avocado (nothing added)',
  '1 mini (57 g)',
  130, 1, 5, 11,
  COALESCE((SELECT max(f."order") FROM "Food" f WHERE f."mealId" = b."mealId"), 0) + 1,
  57,
  230,
  '{"fiber":3,"sugar":0,"satFat":2,"monoFat":5.59,"polyFat":1.04,"cholesterol":0,"sodium":5,"potassium":280,"calcium":7.41,"iron":0.35,"magnesium":16.53,"zinc":0.39,"phosphorus":30.78,"copper":0.1,"manganese":0.08,"selenium":0.23,"vitaminA":3.99,"vitaminC":5.02,"vitaminD":0,"vitaminE":1.12,"vitaminK":11.97,"thiamin":0.04,"riboflavin":0.08,"niacin":1.09,"pantothenicAcid":0.83,"vitaminB6":0.16,"folate":50.73,"vitaminB12":0,"choline":8.09}'::jsonb
FROM breakfast b
WHERE NOT EXISTS (
  SELECT 1 FROM "Food" f
  JOIN "Meal" m ON m."id" = f."mealId"
  WHERE m."planId" = b."planId" AND f."name" = 'Wholly smashed avocado (nothing added)'
)
ON CONFLICT DO NOTHING;

-- The catalog's "Olive Oil" preset at one serving (src/lib/food-presets.ts,
-- USDA 171413 scaled to 14 g), so the builder still recognises the row.
INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_olive_' || b."mealId",
  b."mealId",
  'Olive Oil',
  '1 tbsp (14 g)',
  119, 0, 0, 14,
  COALESCE((SELECT max(f."order") FROM "Food" f WHERE f."mealId" = b."mealId"), 0) + 1,
  14,
  224,
  '{"fiber":0,"sugar":0,"satFat":1.93,"monoFat":10.22,"polyFat":1.47,"cholesterol":0,"sodium":0.28,"potassium":0.14,"calcium":0.14,"iron":0.08,"magnesium":0,"zinc":0,"phosphorus":0,"copper":0,"manganese":0,"selenium":0,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":2,"vitaminK":8.43,"thiamin":0,"riboflavin":0,"niacin":0,"pantothenicAcid":0,"vitaminB6":0,"folate":0,"vitaminB12":0,"choline":0.04}'::jsonb
FROM breakfast b
WHERE NOT EXISTS (
  SELECT 1 FROM "Food" f
  JOIN "Meal" m ON m."id" = f."mealId"
  WHERE m."planId" = b."planId" AND lower(btrim(f."name")) LIKE 'olive oil%'
)
ON CONFLICT DO NOTHING;

UPDATE "NutritionPlan" p
SET
  "targetCalories" = t."calories",
  "targetProtein"  = t."protein",
  "targetCarbs"    = t."carbs",
  "targetFat"      = t."fat",
  "title" = regexp_replace(p."title", '[0-9][0-9,]* kcal', to_char(t."calories", 'FM999,999') || ' kcal'),
  "updatedAt" = NOW()
FROM (
  SELECT
    m."planId",
    COALESCE(sum(f."calories"), 0)::int AS "calories",
    COALESCE(sum(f."protein"), 0)::int  AS "protein",
    COALESCE(sum(f."carbs"), 0)::int    AS "carbs",
    COALESCE(sum(f."fat"), 0)::int      AS "fat"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT "id" FROM own_plans)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE breakfast;
DROP TABLE own_plans;
