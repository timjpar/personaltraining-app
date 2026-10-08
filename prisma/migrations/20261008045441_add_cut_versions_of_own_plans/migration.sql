-- Data migration: cut versions of one coach's Training Day and Rest Day plans,
-- added to their library and assigned to nobody — an option for later, not a
-- change to what they eat now. Their profile and current plans are untouched.
--
-- Each is a copy of the library plan as it stands, with the cut taken mostly
-- from carbohydrate so protein stays near 200 g and fat in the 90s:
--   - oats ¾ → ½ cup (60 → 40 g), both days
--   - sunflower seeds 28 → 20 g, both days, so the breakfasts stay identical
--   - pre-workout blueberries 100 → 50 g, training day
--   - rice halved on training days (252 → 126 g) and dropped on rest days
--   - rinsed black beans 240 → 180 g, both days
-- about 2,485 and 2,304 kcal — roughly 2,400 a day across four training days
-- and three rest days, ~320 under the current plans, aimed at about 0.5% of
-- bodyweight a week.
--
-- Rows are copied whole — micronutrients, weight and density included — and a
-- trimmed row has macros, grams and nutrients scaled by the same factor, the
-- way the builder's amount box scales one. Same safety rules as the plan
-- migrations before it: owner by email, fixed ids with ON CONFLICT DO NOTHING
-- so a re-deploy is a no-op, and source plans found by id within that owner's
-- own library, so a missing source copies nothing.

CREATE TEMP TABLE cut_plan ("source" TEXT, "target" TEXT, "label" TEXT, "summary" TEXT);
INSERT INTO cut_plan VALUES
  ('seed_td_plan_lib', 'nplan_td_cut_lib', 'Training Day Cut',
   'The cut version of Training Day: oats, sunflower seeds, pre-workout blueberries, rice and beans trimmed, protein held near 200 g.'),
  ('nplan_rest_lib', 'nplan_rest_cut_lib', 'Rest Day Cut',
   'The cut version of Rest Day: oats, sunflower seeds and beans trimmed and the rice dropped, protein held near 200 g.');

-- What changes, by name and exact amount; a null "to" drops the row. "meal"
-- narrows a rule to one meal (only the pre-workout blueberries are trimmed).
CREATE TEMP TABLE cut_rule ("name" TEXT, "from" TEXT, "meal" TEXT, "to" TEXT, "factor" NUMERIC);
INSERT INTO cut_rule VALUES
  ('Rolled oats',          '¾ cup dry (60 g)',  NULL,          '½ cup dry (40 g)',  2.0 / 3),
  ('Sunflower Seeds',      '28 g',              NULL,          '20 g',              20.0 / 28),
  ('Blueberries',          '100 g',             'Pre-workout', '50 g',              0.5),
  ('Jasmine rice, cooked', '2 × 126 g (252 g)', NULL,          '2 × 63 g (126 g)',  0.5),
  ('Jasmine rice, cooked', '2 × 42 g (84 g)',   NULL,          NULL,                0),
  ('Black beans, rinsed',  '2 × 120 g (240 g)', NULL,          '2 × 90 g (180 g)',  0.75);

INSERT INTO "NutritionPlan" ("id", "title", "notes", "targetCalories", "targetProtein", "targetCarbs", "targetFat", "assignedAt", "createdAt", "updatedAt", "trainerId", "clientId")
SELECT c."target", c."label", c."summary", NULL, NULL, NULL, NULL, NULL, NOW(), NOW(), p."trainerId", NULL
FROM cut_plan c
JOIN "NutritionPlan" p ON p."id" = c."source"
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND p."clientId" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT c."target" || '_m' || m."order", c."target", m."name", m."notes", m."order"
FROM cut_plan c
JOIN "Meal" m ON m."planId" = c."source"
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" t WHERE t."id" = c."target")
ON CONFLICT DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'cut_' || f."id",
  c."target" || '_m' || m."order",
  f."name",
  COALESCE(r."to", f."quantity"),
  CASE WHEN r."name" IS NULL THEN f."calories" ELSE round(f."calories" * r."factor")::int END,
  CASE WHEN r."name" IS NULL THEN f."protein"  ELSE round(f."protein"  * r."factor")::int END,
  CASE WHEN r."name" IS NULL THEN f."carbs"    ELSE round(f."carbs"    * r."factor")::int END,
  CASE WHEN r."name" IS NULL THEN f."fat"      ELSE round(f."fat"      * r."factor")::int END,
  f."order",
  CASE WHEN r."name" IS NULL THEN f."grams" ELSE f."grams" * r."factor" END,
  f."gramsPerCup",
  CASE
    WHEN r."name" IS NULL OR f."nutrients" IS NULL THEN f."nutrients"
    ELSE (
      SELECT jsonb_object_agg(
        e.key,
        CASE WHEN jsonb_typeof(e.value) = 'number'
          THEN to_jsonb(round((e.value #>> '{}')::numeric * r."factor", 2))
          ELSE e.value
        END)
      FROM jsonb_each(f."nutrients") e
    )
  END
FROM cut_plan c
JOIN "Meal" m ON m."planId" = c."source"
JOIN "Food" f ON f."mealId" = m."id"
LEFT JOIN cut_rule r
  ON r."name" = f."name"
 AND r."from" = f."quantity"
 AND (r."meal" IS NULL OR r."meal" = m."name")
WHERE EXISTS (SELECT 1 FROM "Meal" t WHERE t."id" = c."target" || '_m' || m."order")
  AND (r."name" IS NULL OR r."to" IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Title, targets and the burrito note follow the foods, the same way every
-- plan migration has kept them: "(489 kcal each)" is half the doubled rows.
UPDATE "NutritionPlan" p
SET
  "title" = c."label" || ' · ' || to_char(t."calories", 'FM999,999') || ' kcal',
  "targetCalories" = t."calories",
  "targetProtein"  = t."protein",
  "targetCarbs"    = t."carbs",
  "targetFat"      = t."fat",
  "notes" = c."summary" || COALESCE(
    ' Two burritos, built the same — the burrito quantities below cover both (' ||
      to_char(b."each", 'FM999,999') || ' kcal each).',
    ''),
  "updatedAt" = NOW()
FROM cut_plan c
JOIN (
  SELECT
    m."planId",
    COALESCE(sum(f."calories"), 0)::int AS "calories",
    COALESCE(sum(f."protein"), 0)::int  AS "protein",
    COALESCE(sum(f."carbs"), 0)::int    AS "carbs",
    COALESCE(sum(f."fat"), 0)::int      AS "fat"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  GROUP BY m."planId"
) t ON t."planId" = c."target"
LEFT JOIN (
  SELECT m."planId", round(sum(f."calories") / 2.0)::int AS "each"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."name" = 'Burrito ×2' AND f."quantity" LIKE '2 ×%'
  GROUP BY m."planId"
) b ON b."planId" = c."target"
WHERE p."id" = c."target"
  AND p."title" = c."label";

DROP TABLE cut_rule;
DROP TABLE cut_plan;
