-- Data migration: ½ tsp each of ground turmeric and ground ginger stirred
-- into one coach's breakfast tea, in every one of their own plans.
--
-- The rows are exactly what src/lib/food-presets.ts derives (scalePreset) for
-- ½ tsp of the catalog's "Ground Turmeric" (USDA 172231) and "Ground Ginger"
-- (USDA 170926, with Japan's food 17068 for chromium, molybdenum and biotin),
-- so they read back as those catalog foods and their unit menus work. No
-- database has turmeric's chromium, molybdenum or biotin, or either spice's
-- iodine, so those keys are absent: unknown, not zero.
--
-- The tea is found per meal as the matcha row, or failing that the last row
-- of a group named "Tea", and the spices go straight after it in its group.
-- Same safety rules as 20261028235900_walnuts_with_the_hemp_hearts: the owner
-- is found by email, only the coach's own plans (library, or assigned to
-- themselves) are touched, and a meal that already has turmeric is skipped,
-- so a re-deploy does nothing. Logged days are left as they were eaten.

CREATE TEMP TABLE tea AS
SELECT DISTINCT ON (f."mealId") f."mealId", m."planId", f."order", f."groupName"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
JOIN "NutritionPlan" p ON p."id" = m."planId"
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND (f."name" ILIKE '%matcha%' OR lower(btrim(f."groupName")) = 'tea')
  AND NOT EXISTS (
    SELECT 1 FROM "Food" t
    WHERE t."mealId" = f."mealId" AND t."name" ILIKE '%turmeric%'
  )
ORDER BY f."mealId", (f."name" ILIKE '%matcha%') DESC, f."order" DESC;

-- Room for two rows straight after the tea.
UPDATE "Food" f
SET "order" = f."order" + 2
FROM tea t
WHERE f."mealId" = t."mealId"
  AND f."order" > t."order";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "groupName", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_turmeric_' || t."mealId", t."mealId",
  'Ground Turmeric', '½ tsp (1.5 g)',
  5, 0, 1, 0,
  t."order" + 1, t."groupName",
  1.5, 144,
  '{"fiber":0.34,"sugar":0.05,"satFat":0.03,"sodium":0.41,"cholesterol":0,"potassium":31.2,"calcium":2.52,"iron":0.83,"magnesium":3.12,"zinc":0.07,"vitaminA":0,"vitaminC":0.01,"vitaminD":0,"vitaminB12":0,"folate":0.3,"monoFat":0.01,"polyFat":0.01,"phosphorus":4.49,"copper":0.02,"manganese":0.3,"selenium":0.1,"vitaminE":0.07,"vitaminK":0.2,"thiamin":0,"riboflavin":0,"niacin":0.02,"vitaminB6":0,"choline":0.74,"pantothenicAcid":0.01,"transFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.01}'::jsonb
FROM tea t
UNION ALL
SELECT
  'food_ginger_' || t."mealId", t."mealId",
  'Ground Ginger', '½ tsp (0.9 g)',
  3, 0, 1, 0,
  t."order" + 2, t."groupName",
  0.9, 86.4,
  '{"fiber":0.13,"sugar":0.03,"satFat":0.03,"sodium":0.25,"cholesterol":0,"potassium":11.88,"calcium":1.02,"iron":0.18,"magnesium":1.93,"zinc":0.04,"vitaminA":0.02,"vitaminC":0.01,"vitaminD":0,"vitaminB12":0,"folate":0.12,"monoFat":0.01,"polyFat":0.01,"phosphorus":1.51,"copper":0.01,"manganese":0.3,"selenium":0.5,"vitaminE":0,"vitaminK":0.01,"thiamin":0,"riboflavin":0,"niacin":0.09,"vitaminB6":0.01,"choline":0.37,"pantothenicAcid":0.01,"transFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.01,"chromium":0.06,"molybdenum":0.1,"biotin":0.09}'::jsonb
FROM tea t
ON CONFLICT DO NOTHING;

-- Targets and title follow the foods, as in 20261028235900_walnuts_with_the_hemp_hearts.
UPDATE "NutritionPlan" p
SET
  "targetCalories" = s."calories",
  "targetProtein"  = s."protein",
  "targetCarbs"    = s."carbs",
  "targetFat"      = s."fat",
  "title" = regexp_replace(p."title", '[0-9][0-9,]* kcal', to_char(s."calories", 'FM999,999') || ' kcal')
FROM (
  SELECT
    m."planId",
    COALESCE(sum(f."calories"), 0)::int AS "calories",
    COALESCE(sum(f."protein"), 0)::int  AS "protein",
    COALESCE(sum(f."carbs"), 0)::int    AS "carbs",
    COALESCE(sum(f."fat"), 0)::int      AS "fat"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT DISTINCT "planId" FROM tea)
  GROUP BY m."planId"
) s
WHERE s."planId" = p."id";

DROP TABLE tea;
