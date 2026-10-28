-- Data migration: a small handful of walnuts back in one coach's breakfast,
-- 8 g (about four halves), on the yogurt beside the hemp hearts.
--
-- The sunflower seeds that replaced them on 20260923120000 stay; this is on
-- top, for the walnut's own sake rather than any nutrient gap. In the Nurses'
-- Health and Health Professionals cohorts, eating walnuts once a week or more
-- (a 28 g serving, ~4 g a day) went with about 19% less cardiovascular disease.
-- 8 g a day is two of those servings a week, the smallest amount that sits
-- clearly inside that group rather than at its edge. The coach asked for as
-- little as still counts, nothing else changed, and the calories taken as
-- they come: +53 kcal, 1 g protein, 1 g carbs, 5 g fat a day.
--
-- The numbers below are exactly what src/lib/food-presets.ts derives for 8 g
-- of the catalog's "Walnuts" (scalePreset, USDA 170187), so the row reads back
-- as that catalog food and its unit menu works.
--
-- Same safety rules as 20261028235000_frozen_broccoli: the owner is found by
-- email, only the coach's own plans (library, or assigned to themselves) are
-- touched, and the hemp hearts are matched on name and exact amount. A meal
-- that already has walnuts is skipped, so a re-deploy does nothing. Logged
-- days are left as they were eaten.

CREATE TEMP TABLE hemp AS
SELECT f."mealId", m."planId", f."order", f."groupName"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
JOIN "NutritionPlan" p ON p."id" = m."planId"
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND m."name" = 'Breakfast'
  AND f."name" = 'Hemp hearts'
  AND f."quantity" = '20 g'
  AND NOT EXISTS (
    SELECT 1 FROM "Food" w
    WHERE w."mealId" = f."mealId" AND w."name" = 'Walnuts'
  );

-- Room for the walnuts straight after the hemp hearts, in the same group.
UPDATE "Food" f
SET "order" = f."order" + 1
FROM hemp h
WHERE f."mealId" = h."mealId"
  AND f."order" > h."order";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "groupName", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_walnuts_' || h."mealId",
  h."mealId",
  'Walnuts',
  '8 g',
  53, 1, 1, 5,
  h."order" + 1,
  h."groupName",
  8,
  117,
  '{"fiber":0.54,"sugar":0.21,"satFat":0.49,"sodium":0.16,"cholesterol":0,"potassium":35.28,"calcium":7.84,"iron":0.23,"magnesium":12.64,"zinc":0.25,"vitaminA":0.08,"vitaminC":0.1,"vitaminD":0,"vitaminB12":0,"folate":7.84,"monoFat":0.71,"polyFat":3.78,"phosphorus":27.68,"copper":0.13,"manganese":0.27,"selenium":0.39,"vitaminE":0.06,"vitaminK":0.22,"thiamin":0.03,"riboflavin":0.01,"niacin":0.09,"vitaminB6":0.04,"choline":3.14,"pantothenicAcid":0.05,"omega3Ala":0.73,"omega3Epa":0,"omega3Dha":0,"omega6La":3.05,"iodine":0}'::jsonb
FROM hemp h
ON CONFLICT DO NOTHING;

-- Targets and title follow the foods, as in 20261028235000_frozen_broccoli.
-- The library sorts by updatedAt, so the changed plans move up together,
-- keeping the order they were in.
UPDATE "NutritionPlan" p
SET
  "targetCalories" = t."calories",
  "targetProtein"  = t."protein",
  "targetCarbs"    = t."carbs",
  "targetFat"      = t."fat",
  "title" = regexp_replace(p."title", '[0-9][0-9,]* kcal', to_char(t."calories", 'FM999,999') || ' kcal'),
  "updatedAt" = p."updatedAt" + (NOW()::timestamp - (
    SELECT max(c."updatedAt") FROM "NutritionPlan" c WHERE c."id" IN (SELECT "planId" FROM hemp)
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
  WHERE m."planId" IN (SELECT DISTINCT "planId" FROM hemp)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE hemp;
