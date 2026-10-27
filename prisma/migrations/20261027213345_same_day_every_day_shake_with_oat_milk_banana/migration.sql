-- Data migration: one coach eats the training day every day. Rest days take the
-- training day's salt (¼ tsp; they sweat in the sauna and on the run anyway)
-- and its blueberries with the whey (100 g, or 50 g on the cut), so each
-- rest plan now matches its training plan food for food. On every day the oat
-- milk and the banana move from breakfast to the whey shake: the oat milk to
-- mix the whey and to take its 390 mg of calcium away from breakfast's plant
-- iron, the banana as fast carbs before training, eaten whole beside the shake
-- rather than blended with the blueberries.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own plans (library, or assigned to themselves), and every row matched
-- by name AND exact amount as read off chalkline.click on 2026-10-27, so a row
-- edited since is left alone. The salt and blueberries are copied whole from
-- the training plans' own rows, micronutrients included; moved rows keep their
-- id, amount and nutrients.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

-- Each plan's shake: the meal that holds the whey.
CREATE TEMP TABLE shake AS
SELECT DISTINCT ON (m."planId") m."planId", m."id" AS "mealId"
FROM "Meal" m
JOIN "Food" f ON f."mealId" = m."id"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" = 'Gold Standard whey'
ORDER BY m."planId", m."name" IN ('Pre-workout', 'Protein shake') DESC, m."order", m."id";

CREATE TEMP TABLE changed ("planId" TEXT);

-- Salt: ⅛ → ¼ tsp, copied from a training plan's burrito row.
CREATE TEMP TABLE salt AS
SELECT f."quantity", f."calories", f."protein", f."carbs", f."fat", f."grams", f."gramsPerCup", f."nutrients"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND m."name" = 'Burrito ×2'
  AND f."name" = 'Iodized Salt'
  AND f."quantity" = '¼ tsp (1.5 g)'
ORDER BY m."planId" IN ('seed_td_plan_lib', 'nplan_td_cut_lib') DESC, f."id"
LIMIT 1;

WITH salted AS (
  UPDATE "Food" f
  SET
    "quantity"    = s."quantity",
    "calories"    = s."calories",
    "protein"     = s."protein",
    "carbs"       = s."carbs",
    "fat"         = s."fat",
    "grams"       = s."grams",
    "gramsPerCup" = s."gramsPerCup",
    "nutrients"   = s."nutrients"
  FROM salt s, "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND m."name" = 'Burrito ×2'
    AND f."name" = 'Iodized Salt'
    AND f."quantity" = '⅛ tsp (0.75 g)'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM salted;

-- Blueberries for a shake that has none, sized by which burrito the plan has:
-- the full one gets the training day's 100 g, the cut one the cut's 50 g.
CREATE TEMP TABLE berries AS
SELECT DISTINCT ON (f."quantity")
  f."quantity", f."calories", f."protein", f."carbs", f."fat", f."grams", f."gramsPerCup", f."nutrients"
FROM "Food" f
JOIN shake s ON s."mealId" = f."mealId"
WHERE f."name" = 'Blueberries'
  AND f."quantity" IN ('100 g', '50 g')
ORDER BY f."quantity", s."planId" IN ('seed_td_plan_lib', 'nplan_td_cut_lib') DESC, f."id";

WITH added AS (
  INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
  SELECT
    'food_shakeberries_' || s."mealId",
    s."mealId",
    'Blueberries',
    b."quantity", b."calories", b."protein", b."carbs", b."fat",
    99,
    b."grams", b."gramsPerCup", b."nutrients"
  FROM shake s
  JOIN "Meal" bm ON bm."planId" = s."planId" AND bm."name" = 'Burrito ×2'
  JOIN "Food" rice ON rice."mealId" = bm."id" AND rice."name" = 'Jasmine rice, cooked'
  JOIN berries b ON b."quantity" = CASE rice."quantity"
    WHEN '2 × 126 g (252 g)' THEN '100 g'
    WHEN '2 × 63 g (126 g)'  THEN '50 g'
  END
  WHERE NOT EXISTS (SELECT 1 FROM "Food" f WHERE f."mealId" = s."mealId" AND f."name" = 'Blueberries')
  ON CONFLICT DO NOTHING
  RETURNING "mealId"
)
INSERT INTO changed
SELECT s."planId" FROM added a JOIN shake s ON s."mealId" = a."mealId";

-- Oat milk and banana move from breakfast to the shake.
WITH moved AS (
  UPDATE "Food" f
  SET "mealId" = s."mealId", "order" = 99
  FROM "Meal" m, shake s
  WHERE f."mealId" = m."id"
    AND s."planId" = m."planId"
    AND m."name" = 'Breakfast'
    AND (
      (f."name" = 'Kirkland organic oat milk' AND f."quantity" = '1 cup (240 ml)') OR
      (f."name" = 'Banana' AND f."quantity" = '1 medium (118 g)')
    )
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM moved;

-- The shake reads in the order it's made: whey, oat milk, blueberries, then
-- the banana beside it; anything else keeps its place after those.
UPDATE "Food" f
SET "order" = r."rn"
FROM (
  SELECT f2."id", row_number() OVER (
    PARTITION BY f2."mealId"
    ORDER BY CASE f2."name"
      WHEN 'Gold Standard whey'        THEN 1
      WHEN 'Kirkland organic oat milk' THEN 2
      WHEN 'Blueberries'               THEN 3
      WHEN 'Banana'                    THEN 4
      ELSE 5 END, f2."order", f2."id"
  ) AS "rn"
  FROM "Food" f2
  WHERE f2."mealId" IN (SELECT "mealId" FROM shake WHERE "planId" IN (SELECT "planId" FROM changed))
) r
WHERE f."id" = r."id";

UPDATE "NutritionPlan" p
SET "notes" = replace(p."notes",
  'Both carrots go in the smoothie; eat the banana whole on the side — blended, its browning enzyme cuts the polyphenols you absorb from the berries.',
  'Both carrots go in the smoothie. The oat milk goes in the whey shake; eat the banana whole beside it — blended with the blueberries, its browning enzyme cuts the polyphenols you absorb from them.')
WHERE p."id" IN (SELECT "planId" FROM changed);

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

DROP TABLE berries;
DROP TABLE salt;
DROP TABLE changed;
DROP TABLE shake;
DROP TABLE own_plans;
