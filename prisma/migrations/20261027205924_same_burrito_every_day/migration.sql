-- Data migration: one coach eats the same burritos every day. Each rest day
-- takes its training day's rice, and the oats come down on both days to pay
-- for it, so breakfast and burritos are identical all week and only the
-- pre-workout blueberries (and the salt) tell the days apart:
--   - Rest Day rice 84 → 252 g, Rest Day Cut gets the cut's 126 g back
--   - oats ¾ → ½ cup (60 → 40 g) on Training Day and Rest Day
--   - oats ½ → ¼ cup (40 → 20 g) on both cut plans
-- Weekly calories stay within ~80 kcal of where they were.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own plans (library, or assigned to themselves), and every change
-- matches name AND exact amount as read off chalkline.click on 2026-10-27, so
-- a row edited to some other amount since is left alone. The rice is copied
-- whole from the training plan's own row, micronutrients included, so the
-- burritos are the same row for row rather than a rescaled approximation.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

-- One statement for both oat rules, so a row trimmed from 60 to 40 g is not
-- then matched again by the 40 → 20 g rule.
CREATE TEMP TABLE oat_trim ("from" TEXT, "to" TEXT, "grams" DOUBLE PRECISION, "factor" NUMERIC);
INSERT INTO oat_trim VALUES
  ('¾ cup dry (60 g)', '½ cup dry (40 g)', 40, 2.0 / 3),
  ('½ cup dry (40 g)', '¼ cup dry (20 g)', 20, 0.5);

WITH trimmed AS (
  UPDATE "Food" f
  SET
    "quantity" = t."to",
    "calories" = round(f."calories" * t."factor")::int,
    "protein"  = round(f."protein" * t."factor")::int,
    "carbs"    = round(f."carbs" * t."factor")::int,
    "fat"      = round(f."fat" * t."factor")::int,
    "grams"    = t."grams",
    "nutrients" = (
      SELECT jsonb_object_agg(
        e.key,
        CASE WHEN jsonb_typeof(e.value) = 'number'
          THEN to_jsonb(round((e.value #>> '{}')::numeric * t."factor", 2))
          ELSE e.value
        END)
      FROM jsonb_each(f."nutrients") e
    )
  FROM oat_trim t, "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Rolled oats'
    AND f."quantity" = t."from"
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM trimmed;

-- The rice each rest plan takes, copied from a training plan's burrito.
CREATE TEMP TABLE rice AS
SELECT DISTINCT ON (f."quantity")
  f."quantity", f."calories", f."protein", f."carbs", f."fat", f."grams", f."gramsPerCup", f."nutrients"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND m."name" = 'Burrito ×2'
  AND f."name" = 'Jasmine rice, cooked'
  AND f."quantity" IN ('2 × 126 g (252 g)', '2 × 63 g (126 g)')
ORDER BY f."quantity", m."planId" IN ('seed_td_plan_lib', 'nplan_td_cut_lib') DESC, f."id";

WITH raised AS (
  UPDATE "Food" f
  SET
    "quantity"    = r."quantity",
    "calories"    = r."calories",
    "protein"     = r."protein",
    "carbs"       = r."carbs",
    "fat"         = r."fat",
    "grams"       = r."grams",
    "gramsPerCup" = r."gramsPerCup",
    "nutrients"   = r."nutrients"
  FROM rice r, "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND m."name" = 'Burrito ×2'
    AND f."name" = 'Jasmine rice, cooked'
    AND f."quantity" = '2 × 42 g (84 g)'
    AND r."quantity" = '2 × 126 g (252 g)'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM raised;

-- Rest Day Cut dropped its rice, so it has no row to raise: give it the
-- training cut's, right after the chicken where the other plans keep it.
CREATE TEMP TABLE rice_slot AS
SELECT
  m."planId",
  m."id" AS "mealId",
  (SELECT min(f."order") FROM "Food" f WHERE f."mealId" = m."id" AND f."name" = 'Chicken breast, cooked') AS "after"
FROM "Meal" m
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND m."name" = 'Burrito ×2'
  AND NOT EXISTS (
    SELECT 1 FROM "Food" f WHERE f."mealId" = m."id" AND f."name" = 'Jasmine rice, cooked'
  )
  AND EXISTS (SELECT 1 FROM rice WHERE "quantity" = '2 × 63 g (126 g)');

-- Only make room when the slot after the chicken is taken.
UPDATE "Food" f
SET "order" = f."order" + 1
FROM rice_slot s
WHERE f."mealId" = s."mealId"
  AND f."order" > s."after"
  AND EXISTS (SELECT 1 FROM "Food" o WHERE o."mealId" = s."mealId" AND o."order" = s."after" + 1);

WITH added AS (
  INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
  SELECT
    'food_rice_' || s."mealId",
    s."mealId",
    'Jasmine rice, cooked',
    r."quantity", r."calories", r."protein", r."carbs", r."fat",
    COALESCE(s."after" + 1, 1),
    r."grams", r."gramsPerCup", r."nutrients"
  FROM rice_slot s
  JOIN rice r ON r."quantity" = '2 × 63 g (126 g)'
  ON CONFLICT DO NOTHING
  RETURNING "mealId"
)
INSERT INTO changed
SELECT m."planId" FROM added a JOIN "Meal" m ON m."id" = a."mealId";

-- Rest Day Cut's summary said the rice was dropped; it is now halved, as on
-- Training Day Cut.
UPDATE "NutritionPlan" p
SET "notes" = replace(p."notes",
  'oats, sunflower seeds and beans trimmed and the rice dropped',
  'oats, sunflower seeds, rice and beans trimmed')
WHERE p."id" IN (SELECT "planId" FROM changed);

-- "(590 kcal each)": half of what the doubled burrito rows add up to, the
-- carrot on the side not included.
UPDATE "NutritionPlan" p
SET "notes" = regexp_replace(p."notes", '\(\d[\d,]* kcal each\)', '(' || to_char(b."each", 'FM999,999') || ' kcal each)')
FROM (
  SELECT m."planId", round(sum(f."calories") / 2.0)::int AS "each"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT "planId" FROM changed)
    AND m."name" = 'Burrito ×2'
    AND f."quantity" LIKE '2 ×%'
  GROUP BY m."planId"
) b
WHERE b."planId" = p."id"
  AND p."notes" ~ '\(\d[\d,]* kcal each\)';

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
  SELECT
    m."planId",
    COALESCE(sum(f."calories"), 0)::int AS "calories",
    COALESCE(sum(f."protein"), 0)::int  AS "protein",
    COALESCE(sum(f."carbs"), 0)::int    AS "carbs",
    COALESCE(sum(f."fat"), 0)::int      AS "fat"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT "planId" FROM changed)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE rice_slot;
DROP TABLE rice;
DROP TABLE oat_trim;
DROP TABLE changed;
DROP TABLE own_plans;
