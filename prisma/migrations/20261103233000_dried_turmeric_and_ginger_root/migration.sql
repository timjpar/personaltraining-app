-- Data migration: the turmeric and ginger in one coach's breakfast tea are
-- dehydrated root, not powder, so the rows that
-- 20261103210000_turmeric_and_ginger_in_the_tea wrote as "Ground Turmeric
-- · ½ tsp (1.5 g)" and "Ground Ginger · ½ tsp (0.9 g)" become the catalog's
-- "Dried Turmeric Root · 1.5 g" and "Dried Ginger Root · 0.9 g".
--
-- Ground is the dried root milled, so the weight and every number per gram
-- stay: the rows below are exactly what src/lib/food-presets.ts derives
-- (scalePreset) for those grams of the dried entries, which are matched to
-- the same USDA foods. The macros come out the same, so no target or title
-- moves; a few micronutrients differ in the last rounded digit. What goes is
-- the teaspoon, and gramsPerCup with it: pieces don't pack like powder.
--
-- Same safety rules as 20261028190000_good_foods_avocado_mash: the owner is
-- found by email, only the coach's own plans (library, or assigned to
-- themselves) and their own log are touched, and a row is renamed only while
-- it is still exactly what the earlier migration wrote, so a re-deploy does
-- nothing. Logged rows are renamed too: what was eaten was the dried root.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

UPDATE "Food" f
SET
  "name" = 'Dried Turmeric Root',
  "quantity" = '1.5 g',
  "gramsPerCup" = NULL
FROM "Meal" m
WHERE f."mealId" = m."id"
  AND m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" = 'Ground Turmeric'
  AND f."quantity" = '½ tsp (1.5 g)'
  AND f."calories" = 5;

UPDATE "Food" f
SET
  "name" = 'Dried Ginger Root',
  "quantity" = '0.9 g',
  "gramsPerCup" = NULL,
  "nutrients" = '{"fiber":0.13,"sugar":0.03,"satFat":0.02,"sodium":0.24,"cholesterol":0,"potassium":11.88,"calcium":1.03,"iron":0.18,"magnesium":1.93,"zinc":0.03,"vitaminA":0.02,"vitaminC":0.01,"vitaminD":0,"vitaminB12":0,"folate":0.12,"monoFat":0,"polyFat":0.01,"phosphorus":1.51,"copper":0,"manganese":0.3,"selenium":0.5,"vitaminE":0,"vitaminK":0.01,"thiamin":0,"riboflavin":0,"niacin":0.09,"vitaminB6":0.01,"choline":0.37,"pantothenicAcid":0,"transFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.01,"chromium":0.05,"molybdenum":0.1,"biotin":0.09}'::jsonb
FROM "Meal" m
WHERE f."mealId" = m."id"
  AND m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" = 'Ground Ginger'
  AND f."quantity" = '½ tsp (0.9 g)'
  AND f."calories" = 3;

UPDATE "LoggedFood" lf
SET
  "name" = 'Dried Turmeric Root',
  "quantity" = '1.5 g',
  "gramsPerCup" = NULL
FROM "NutritionLog" l
JOIN "User" u ON u."id" = l."clientId"
WHERE lf."logId" = l."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Ground Turmeric'
  AND lf."quantity" = '½ tsp (1.5 g)'
  AND lf."calories" = 5;

UPDATE "LoggedFood" lf
SET
  "name" = 'Dried Ginger Root',
  "quantity" = '0.9 g',
  "gramsPerCup" = NULL,
  "nutrients" = '{"fiber":0.13,"sugar":0.03,"satFat":0.02,"sodium":0.24,"cholesterol":0,"potassium":11.88,"calcium":1.03,"iron":0.18,"magnesium":1.93,"zinc":0.03,"vitaminA":0.02,"vitaminC":0.01,"vitaminD":0,"vitaminB12":0,"folate":0.12,"monoFat":0,"polyFat":0.01,"phosphorus":1.51,"copper":0,"manganese":0.3,"selenium":0.5,"vitaminE":0,"vitaminK":0.01,"thiamin":0,"riboflavin":0,"niacin":0.09,"vitaminB6":0.01,"choline":0.37,"pantothenicAcid":0,"transFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.01,"chromium":0.05,"molybdenum":0.1,"biotin":0.09}'::jsonb
FROM "NutritionLog" l
JOIN "User" u ON u."id" = l."clientId"
WHERE lf."logId" = l."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Ground Ginger'
  AND lf."quantity" = '½ tsp (0.9 g)'
  AND lf."calories" = 3;

DROP TABLE own_plans;
