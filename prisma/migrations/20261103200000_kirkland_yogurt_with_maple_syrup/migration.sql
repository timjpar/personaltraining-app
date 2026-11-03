-- Data migration: the breakfast yogurt in one coach's own plans becomes the
-- one actually bought, Kirkland Signature organic Greek yogurt, plain, nonfat,
-- and 1 tbsp of maple syrup goes on it to sweeten it.
--
-- Old row (from the load-training-day-plan migration): "Skotidakis yogurt",
-- ⅔ cup (170 g), 200 kcal, 16 g protein, 7 g carbs, 12 g fat, whole milk.
-- New row, from the tub's label for the same ⅔ cup (170 g): 100 kcal, 18 g
-- protein, 7 g carbs, 0 g fat; sodium 65 mg, cholesterol 10 mg, sugars 4 g
-- (0 g added), calcium 220 mg, potassium 270 mg, iron and vitamin D 0. The
-- rest is USDA 170894 (Greek yogurt, plain, nonfat) scaled to 170 g, as the
-- catalog's "Greek Yogurt, 0%" does.
--
-- The syrup is the catalog's "Maple Syrup" at 1 tbsp (20 g), USDA 169661:
-- 52 kcal, 13 g carbs, 12.1 g sugar, all of it added.
--
-- Net per plan: -48 kcal, +2 g protein, +13 g carbs, -12 g fat.
--
-- The coach edits plans in the app, so the yogurt is matched by "yogurt"
-- anywhere in its name rather than one exact string, only in the coach's own
-- plans (library, or assigned to themselves), found by email. A row that is
-- already the Kirkland yogurt is left alone, and syrup goes in only where the
-- meal has none, so a re-deploy does nothing. Logged days stay as eaten.

CREATE TEMP TABLE yogurt AS
SELECT f."id", f."mealId", m."planId", f."order", f."groupName"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
JOIN "NutritionPlan" p ON p."id" = m."planId"
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" ILIKE '%yogurt%';

UPDATE "Food" f
SET
  "name" = 'Kirkland organic Greek yogurt, nonfat',
  "quantity" = '⅔ cup (170 g)',
  "calories" = 100, "protein" = 18, "carbs" = 7, "fat" = 0,
  "grams" = 170,
  "gramsPerCup" = 255,
  "nutrients" = '{"fiber":0,"sugar":4,"addedSugar":0,"satFat":0,"transFat":0,"monoFat":0.09,"polyFat":0.02,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.02,"cholesterol":10,"sodium":65,"potassium":270,"calcium":220,"iron":0,"magnesium":18.7,"zinc":0.88,"iodine":87.04,"phosphorus":229.5,"copper":0.03,"manganese":0.02,"selenium":16.49,"chromium":0,"molybdenum":9.3,"vitaminA":1.7,"vitaminC":0,"vitaminD":0,"vitaminE":0.02,"vitaminK":0,"thiamin":0.04,"riboflavin":0.47,"niacin":0.35,"pantothenicAcid":0.56,"vitaminB6":0.11,"biotin":4.88,"folate":11.9,"vitaminB12":1.27,"choline":25.67}'::jsonb
FROM yogurt y
WHERE f."id" = y."id"
  AND f."name" <> 'Kirkland organic Greek yogurt, nonfat';

-- Syrup straight after the yogurt, in its group, where the meal has none yet.
DELETE FROM yogurt y
WHERE EXISTS (
  SELECT 1 FROM "Food" s
  WHERE s."mealId" = y."mealId" AND s."name" ILIKE '%maple%'
);

UPDATE "Food" f
SET "order" = f."order" + 1
FROM yogurt y
WHERE f."mealId" = y."mealId"
  AND f."order" > y."order";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "groupName", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_maple_' || y."id",
  y."mealId",
  'Maple Syrup',
  '1 tbsp (20 g)',
  52, 0, 13, 0,
  y."order" + 1,
  y."groupName",
  20,
  320,
  '{"fiber":0,"sugar":12.1,"addedSugar":12.1,"satFat":0,"monoFat":0,"polyFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0,"cholesterol":0,"sodium":2.4,"potassium":42.4,"calcium":20.4,"iron":0.02,"magnesium":4.2,"zinc":0.29,"phosphorus":0.4,"copper":0,"manganese":0.58,"selenium":0.12,"chromium":1.01,"molybdenum":0.4,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":0,"vitaminK":0,"thiamin":0.01,"riboflavin":0.25,"niacin":0.02,"pantothenicAcid":0.01,"vitaminB6":0,"biotin":0.02,"folate":0,"vitaminB12":0,"choline":0.32}'::jsonb
FROM yogurt y
ON CONFLICT DO NOTHING;

-- Targets and title follow the foods, as in 20261028235900_walnuts_with_the_hemp_hearts.
CREATE TEMP TABLE touched AS
SELECT DISTINCT m."planId"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
JOIN "NutritionPlan" p ON p."id" = m."planId"
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = 'Kirkland organic Greek yogurt, nonfat';

UPDATE "NutritionPlan" p
SET
  "targetCalories" = t."calories",
  "targetProtein"  = t."protein",
  "targetCarbs"    = t."carbs",
  "targetFat"      = t."fat",
  "title" = regexp_replace(p."title", '[0-9][0-9,]* kcal', to_char(t."calories", 'FM999,999') || ' kcal')
FROM (
  SELECT
    m."planId",
    COALESCE(sum(f."calories"), 0)::int AS "calories",
    COALESCE(sum(f."protein"), 0)::int  AS "protein",
    COALESCE(sum(f."carbs"), 0)::int    AS "carbs",
    COALESCE(sum(f."fat"), 0)::int      AS "fat"
  FROM "Meal" m
  JOIN "Food" f ON f."mealId" = m."id"
  WHERE m."planId" IN (SELECT "planId" FROM touched)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE touched;
DROP TABLE yogurt;
