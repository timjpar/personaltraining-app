-- Data migration: one coach takes lion's mane as a powder, so the
-- "Lion's mane · 2 g" row becomes "Lion's mane powder · 2 g", with numbers for
-- the dried mushroom rather than the hand-typed 8 kcal.
--
-- It also puts the lemon juice back where it was lost. The plan builder's save
-- rewrites every food in a plan, so a Training Day editor opened before
-- 20261027215559_bottled_lemon_juice ran and saved after it wrote "Lemon water
-- · ½ lemon" back. The same swap as that migration, for any row that has it.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own plans (library, or assigned to themselves), and every row matched
-- by name AND exact amount as read off chalkline.click on 2026-10-27, so a row
-- edited since is left alone. Logged days are not touched.
--
-- Lion's mane: USDA Foundation Foods 1999626, lion's mane mushroom, raw
-- (88.57 g water per 100 g), scaled to a dried powder by dry matter at the
-- 9.5 g water of USDA's dried shiitake (SR Legacy 168436): 7.92 times the raw
-- figure per gram, 278 kcal per 100 g. Energy is USDA's specific-factor figure,
-- which counts the fibre the way a mushroom's actually yields. Nutrients the
-- analysis didn't measure are left out rather than written as zero. Not tracked
-- here but in the same 2 g: 0.44 g beta-glucan and 2.7 mg ergothioneine.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

WITH powdered AS (
  UPDATE "Food" f
  SET
    "name"        = 'Lion''s mane powder',
    "calories"    = 6,
    "protein"     = 0,
    "carbs"       = 1,
    "fat"         = 0,
    "grams"       = 2,
    "gramsPerCup" = NULL,
    "nutrients"   = '{"fiber":0.69,"sodium":0.05,"potassium":70.2,"calcium":0,"iron":0.11,"magnesium":1.86,"zinc":0.12,"phosphorus":14.88,"copper":0.03,"manganese":0.03,"selenium":0.28,"vitaminD":0,"thiamin":0.02,"riboflavin":0.06,"niacin":0.26,"vitaminB6":0.01,"biotin":2.68,"folate":4.68}'::jsonb
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Lion''s mane'
    AND f."quantity" = '2 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM powdered;

-- USDA SR Legacy 167748, as in 20261027215559_bottled_lemon_juice.
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
