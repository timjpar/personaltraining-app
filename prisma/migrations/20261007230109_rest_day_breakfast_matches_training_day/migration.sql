-- Data migration: one coach's rest-day breakfast lined up with their training
-- day's, so both days start the same: a banana every day, and the 28 g of
-- sunflower seeds the training day was given in the app instead of 20 g.
--
-- Same safety rules as 20261007224958_wholly_avocado_and_olive_oil_daily: owner
-- by email, only the coach's own plans (library, or assigned to themselves),
-- every step guarded by the state it produces. Read off chalkline.click on
-- 2026-10-07, those were the only breakfast differences; the rest of each day
-- (pre-workout blueberries, the rice, the carrot) is left as it is.
--
-- Both foods are written exactly as the builder saves a catalog pick
-- (src/lib/food-presets.ts: "Sunflower Seeds" at 28 g, "Banana" at 1 medium),
-- so the builder still recognises them.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE breakfast AS
SELECT DISTINCT ON (m."planId") m."planId", m."id" AS "mealId"
FROM "Meal" m
WHERE m."planId" IN (SELECT "id" FROM own_plans)
ORDER BY m."planId", (m."name" = 'Breakfast') DESC, m."order", m."id";

-- In place, so the seeds keep their spot in the meal.
UPDATE "Food" f
SET
  "name" = 'Sunflower Seeds',
  "quantity" = '28 g',
  "calories" = 165, "protein" = 5, "carbs" = 6, "fat" = 14,
  "grams" = 28,
  "gramsPerCup" = 140,
  "nutrients" = '{"fiber":2.41,"sugar":0.73,"satFat":1.25,"monoFat":5.18,"polyFat":6.47,"cholesterol":0,"sodium":2.52,"potassium":180.6,"calcium":21.84,"iron":1.47,"magnesium":91,"zinc":1.4,"phosphorus":184.8,"copper":0.5,"manganese":0.55,"selenium":14.84,"vitaminA":0.84,"vitaminC":0.39,"vitaminD":0,"vitaminE":9.86,"vitaminK":0,"thiamin":0.41,"riboflavin":0.1,"niacin":2.34,"pantothenicAcid":0.32,"vitaminB6":0.38,"folate":63.56,"vitaminB12":0,"choline":15.43}'::jsonb
FROM breakfast b
WHERE f."mealId" = b."mealId"
  AND lower(btrim(f."name")) = 'sunflower seeds'
  AND f."quantity" = '20 g';

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_banana_' || b."mealId",
  b."mealId",
  'Banana',
  '1 medium (118 g)',
  105, 1, 27, 0,
  COALESCE((SELECT max(f."order") FROM "Food" f WHERE f."mealId" = b."mealId"), 0) + 1,
  118,
  150,
  '{"fiber":3.07,"sugar":14.4,"satFat":0.13,"monoFat":0.04,"polyFat":0.09,"cholesterol":0,"sodium":1.18,"potassium":422.44,"calcium":5.9,"iron":0.31,"magnesium":31.86,"zinc":0.18,"phosphorus":25.96,"copper":0.09,"manganese":0.32,"selenium":1.18,"vitaminA":3.54,"vitaminC":10.27,"vitaminD":0,"vitaminE":0.12,"vitaminK":0.59,"thiamin":0.04,"riboflavin":0.09,"niacin":0.78,"pantothenicAcid":0.39,"vitaminB6":0.43,"folate":23.6,"vitaminB12":0,"choline":11.56}'::jsonb
FROM breakfast b
WHERE NOT EXISTS (
  SELECT 1 FROM "Food" f
  JOIN "Meal" m ON m."id" = f."mealId"
  WHERE m."planId" = b."planId" AND lower(btrim(f."name")) LIKE 'banana%'
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
WHERE t."planId" = p."id"
  AND (p."targetCalories", p."targetProtein", p."targetCarbs", p."targetFat")
      IS DISTINCT FROM (t."calories", t."protein", t."carbs", t."fat");

DROP TABLE breakfast;
DROP TABLE own_plans;
