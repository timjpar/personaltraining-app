-- Data migration: more olive oil and walnuts in one coach's plans, with chicken
-- coming out of both burritos to pay for them.
--
-- The coach wanted both fats up without the calories going up, so:
--
--   Olive Oil                1 tbsp -> 4 tsp    +40 kcal, +5 g fat
--   Walnuts                  8 g -> 16 g        +53 kcal, +1 g protein,
--                                               +1 g carbs, +5 g fat
--   Chicken, in each burrito 150 g -> 120 g     -50 kcal, -9 g protein, -1 g fat
--
-- With two burritos that is -7 kcal, -17 g protein, +1 g carbs and +8 g fat a
-- day: protein 203 -> 186 g (still about 2.4 g/kg) and fat 88 -> 96 g (about 32%
-- of calories, inside the usual 20-35% range). Chicken stops at 120 g rather
-- than the 122 g that would break even: it is a rounder number to weigh, and it
-- leaves the day just under where it was instead of just over.
--
-- The olive oil and walnut numbers are exactly what src/lib/food-presets.ts
-- derives for 4 tsp and 16 g of the catalog foods (scalePreset), so both rows
-- read back as those catalog foods and their unit menus work. The chicken row
-- is not a catalog food, so it scales by 0.8 from what it holds.
--
-- Also corrects Rest Day's frozen blueberries, which say 200 g but still carry
-- the macros and nutrients of the 1 cup (155 g) serving: 23 kcal and 6 g carbs
-- short of the same food in Training Day. The row takes Training Day's numbers.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email, only the coach's own plans (library, or assigned to themselves) are
-- touched, and rows are matched on name and exact amount, so a re-deploy does
-- nothing. Logged days are left as they were eaten.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

WITH olive AS (
  UPDATE "Food" f
  SET
    "quantity" = '4 tsp (19 g)',
    "grams" = 18.67,
    "calories" = 159,
    "protein" = 0,
    "carbs" = 0,
    "fat" = 19,
    "nutrients" = (
      SELECT jsonb_object_agg(e.key, round((e.value)::numeric * 4 / 3, 2))
      FROM jsonb_each_text(f."nutrients") e
    )
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Olive Oil'
    AND f."quantity" = '1 tbsp (14 g)'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM olive;

WITH walnuts AS (
  UPDATE "Food" f
  SET
    "quantity" = '16 g',
    "grams" = 16,
    "calories" = 106,
    "protein" = 2,
    "carbs" = 2,
    "fat" = 10,
    "nutrients" = (
      SELECT jsonb_object_agg(e.key, round((e.value)::numeric * 2, 2))
      FROM jsonb_each_text(f."nutrients") e
    )
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Walnuts'
    AND f."quantity" = '8 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM walnuts;

WITH chicken AS (
  UPDATE "Food" f
  SET
    "quantity" = '120 g',
    "grams" = 120,
    "calories" = 198,
    "protein" = 37,
    "carbs" = 0,
    "fat" = 5,
    "nutrients" = (
      SELECT jsonb_object_agg(e.key, round((e.value)::numeric * 0.8, 2))
      FROM jsonb_each_text(f."nutrients") e
    )
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Chicken breast, cooked'
    AND f."quantity" = '150 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM chicken;

-- Matched on the 79 kcal the short row carries, so a corrected row is left be.
WITH correct AS (
  SELECT f."nutrients"
  FROM "Food" f
  JOIN "Meal" m ON m."id" = f."mealId"
  WHERE m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Blueberries, Frozen'
    AND f."quantity" = '200 g'
    AND f."calories" = 102
    AND f."nutrients" IS NOT NULL
  ORDER BY f."id"
  LIMIT 1
), blueberries AS (
  UPDATE "Food" f
  SET
    "grams" = 200,
    "gramsPerCup" = 155,
    "calories" = 102,
    "protein" = 1,
    "carbs" = 25,
    "fat" = 1,
    "nutrients" = c."nutrients"
  FROM "Meal" m, correct c
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Blueberries, Frozen'
    AND f."quantity" = '200 g'
    AND f."calories" = 79
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM blueberries;

-- Targets and title follow the foods. The library sorts by updatedAt, so the
-- changed plans move up together, keeping the order they were in.
UPDATE "NutritionPlan" p
SET
  "targetCalories" = t."calories",
  "targetProtein"  = t."protein",
  "targetCarbs"    = t."carbs",
  "targetFat"      = t."fat",
  "title" = regexp_replace(p."title", '[0-9][0-9,]* kcal', to_char(t."calories", 'FM999,999') || ' kcal'),
  "updatedAt" = p."updatedAt" + (NOW()::timestamp - (
    SELECT max(c."updatedAt") FROM "NutritionPlan" c WHERE c."id" IN (SELECT "planId" FROM changed)
  ))
FROM (
  SELECT m."planId",
    COALESCE(sum(f."calories"), 0)::int AS "calories",
    COALESCE(sum(f."protein"), 0)::int  AS "protein",
    COALESCE(sum(f."carbs"), 0)::int    AS "carbs",
    COALESCE(sum(f."fat"), 0)::int      AS "fat"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT DISTINCT "planId" FROM changed)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE changed;
DROP TABLE own_plans;
