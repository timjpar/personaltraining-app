-- Data migration: one coach now makes their lemon water with bottled lemon
-- juice instead of squeezing half a lemon, so the "Lemon water · ½ lemon" row
-- becomes 1½ tbsp of lemon juice: about the same juice half a lemon gives
-- (USDA puts a whole lemon's yield at 48 g), now measured by the spoon.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own plans (library, or assigned to themselves), and the row matched
-- by name AND exact amount as read off chalkline.click on 2026-10-27, so a row
-- edited since is left alone. Logged days are a record of what was eaten then,
-- and are not touched.
--
-- Numbers: USDA SR Legacy 167748, lemon juice from concentrate, canned or
-- bottled, at 22.9 g (1½ tbsp of its 244 g cup). Against the fresh juice it
-- replaces, that is 4 kcal rather than 8, a third of the vitamin C (3.3 mg
-- rather than 9.3) and more sodium (5.5 mg, from the preservatives). SR Legacy
-- has no iodine, chromium, molybdenum or biotin for it, so those keep the fresh
-- juice's figures per gram: the same fruit, and trace amounts either way.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

WITH swapped AS (
  UPDATE "Food" f
  SET
    "name"        = 'Lemon juice',
    "quantity"    = '1½ tbsp (23 g)',
    "calories"    = 4,
    "protein"     = 0,
    "carbs"       = 1,
    "fat"         = 0,
    "grams"       = 22.9,
    "gramsPerCup" = 244,
    "nutrients"   = '{"fiber":0.16,"sugar":0.35,"addedSugar":0,"satFat":0.01,"transFat":0,"monoFat":0,"polyFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0,"cholesterol":0,"sodium":5.49,"potassium":24.93,"calcium":2.29,"iron":0.01,"magnesium":1.6,"zinc":0.04,"iodine":0.34,"phosphorus":2.06,"copper":0,"manganese":0,"selenium":0.02,"chromium":0,"molybdenum":0.18,"vitaminA":0.46,"vitaminC":3.27,"vitaminD":0,"vitaminE":0.05,"vitaminK":0.02,"thiamin":0,"riboflavin":0,"niacin":0.04,"pantothenicAcid":0.02,"vitaminB6":0.01,"biotin":0.06,"folate":2.06,"vitaminB12":0,"choline":1.17}'::jsonb
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Lemon water'
    AND f."quantity" = '½ lemon'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM swapped;

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
  WHERE m."planId" IN (SELECT DISTINCT "planId" FROM changed)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE changed;
DROP TABLE own_plans;
