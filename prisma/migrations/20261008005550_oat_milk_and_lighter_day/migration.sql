-- Data migration: a cup of fortified oat milk in one coach's matcha every day,
-- paid for by trimming the rice, oats and chia, so each day lands about 105
-- kcal lighter with protein and fat where they were.
--
-- Same safety rules as 20261007230109_rest_day_breakfast_matches_training_day:
-- owner by email, only the coach's own plans (library, or assigned to
-- themselves), every step guarded by the state it produces. Trims match name
-- AND exact amount, as read off chalkline.click on 2026-10-07, so a row edited
-- to some other amount since is left alone.
--
-- The oat milk is the Kirkland Signature Organic Oat Beverage label (1 cup,
-- 240 mL): 120 kcal, 3 g protein, 16 g carbs, 5 g fat, and every nutrient the
-- label prints. Nothing else is filled in; an absent key is unknown, not zero.
-- Weight assumes 1.03 g/mL.

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

-- Macros, weight and micronutrients all scale by the same factor, from what is
-- stored, the way the builder's servings box scales a row.
CREATE TEMP TABLE trims ("name" TEXT, "from" TEXT, "to" TEXT, "factor" NUMERIC);
INSERT INTO trims VALUES
  ('Rolled oats',          '1 cup dry (80 g)',  '¾ cup dry (60 g)',  0.75),
  ('Chia seeds',           '20 g',              '10 g',              0.5),
  ('Jasmine rice, cooked', '2 × 168 g (336 g)', '2 × 126 g (252 g)', 0.75),
  ('Jasmine rice, cooked', '2 × 84 g (168 g)',  '2 × 42 g (84 g)',   0.5);

UPDATE "Food" f
SET
  "quantity" = t."to",
  "calories" = round(f."calories" * t."factor")::int,
  "protein"  = round(f."protein" * t."factor")::int,
  "carbs"    = round(f."carbs" * t."factor")::int,
  "fat"      = round(f."fat" * t."factor")::int,
  "grams"    = f."grams" * t."factor",
  "nutrients" = (
    SELECT jsonb_object_agg(
      e.key,
      CASE WHEN jsonb_typeof(e.value) = 'number'
        THEN to_jsonb(round((e.value #>> '{}')::numeric * t."factor", 2))
        ELSE e.value
      END)
    FROM jsonb_each(f."nutrients") e
  )
FROM trims t, "Meal" m
WHERE f."mealId" = m."id"
  AND m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" = t."name"
  AND f."quantity" = t."from";

-- The oat milk goes in the matcha, so it sits right after it in the list.
CREATE TEMP TABLE oat_milk_slot AS
SELECT
  b."planId",
  b."mealId",
  (SELECT min(f."order") FROM "Food" f WHERE f."mealId" = b."mealId" AND lower(btrim(f."name")) = 'matcha') AS "after"
FROM breakfast b
WHERE NOT EXISTS (
  SELECT 1 FROM "Food" f
  JOIN "Meal" m ON m."id" = f."mealId"
  WHERE m."planId" = b."planId" AND lower(f."name") LIKE '%oat milk%'
);

UPDATE "Food" f
SET "order" = f."order" + 1
FROM oat_milk_slot s
WHERE f."mealId" = s."mealId"
  AND f."order" > s."after";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_oatmilk_' || s."mealId",
  s."mealId",
  'Kirkland organic oat milk',
  '1 cup (240 ml)',
  120, 3, 16, 5,
  COALESCE(s."after" + 1, (SELECT max(f."order") FROM "Food" f WHERE f."mealId" = s."mealId") + 1, 1),
  247.2,
  243.7,
  '{"fiber":2,"sugar":7,"satFat":0.5,"cholesterol":0,"sodium":95,"potassium":50,"calcium":390,"iron":0.35,"vitaminA":90,"vitaminD":4,"riboflavin":0.3,"vitaminB12":0.6}'::jsonb
FROM oat_milk_slot s
ON CONFLICT DO NOTHING;

-- "(640 kcal each)": half of what the doubled burrito rows add up to, the
-- carrot on the side not included.
UPDATE "NutritionPlan" p
SET "notes" = regexp_replace(p."notes", '\(\d[\d,]* kcal each\)', '(' || to_char(b."each", 'FM999,999') || ' kcal each)')
FROM (
  SELECT m."planId", round(sum(f."calories") / 2.0)::int AS "each"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT "id" FROM own_plans)
    AND m."name" = 'Burrito ×2'
    AND f."quantity" LIKE '2 ×%'
  GROUP BY m."planId"
) b
WHERE b."planId" = p."id"
  AND p."notes" ~ '\(\d[\d,]* kcal each\)';

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

DROP TABLE oat_milk_slot;
DROP TABLE trims;
DROP TABLE breakfast;
DROP TABLE own_plans;
