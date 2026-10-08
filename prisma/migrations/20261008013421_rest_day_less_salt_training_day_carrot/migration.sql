-- Data migration: half the iodized salt on one coach's rest days, and the
-- carrot their training day never got.
--
-- Rest days drop from ¼ to ⅛ tsp: sodium was 110% of the daily value with no
-- training sweat to replace, and ⅛ tsp still leaves iodine near 100% (39 µg
-- here plus the yogurt and whey). Training days keep ¼ tsp. The carrot goes
-- with the burritos, as on rest days, where 20260923140000_add_carrot_with_burritos
-- meant it to be: that migration matched the training day by a title the plan
-- no longer had, so only the rest day got one. It takes the training day's
-- vitamin A from 27% to about 84%.
--
-- Same safety rules as 20261008010805_iodine_fats_and_salt_for_own_plans:
-- owner by email, only the coach's own plans (library, or assigned to
-- themselves), each step guarded by the state it produces. Rest days are the
-- plans titled "Rest Day …". Both rows are the catalog foods at the amounts
-- written, stored as the builder saves them, so the builder still recognises
-- them. Targets and titles then follow the foods, as before.

CREATE TEMP TABLE own_plans AS
SELECT p."id", p."title"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

UPDATE "Food" f
SET
  "quantity" = '⅛ tsp (0.75 g)',
  "grams" = 0.75,
  "nutrients" = '{"fiber":0,"sugar":0,"satFat":0,"transFat":0,"monoFat":0,"polyFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0,"cholesterol":0,"sodium":291,"potassium":0.06,"calcium":0.18,"iron":0,"magnesium":0.01,"zinc":0,"iodine":39.08,"phosphorus":0,"copper":0,"manganese":0,"selenium":0,"chloride":448.5,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":0,"vitaminK":0,"thiamin":0,"riboflavin":0,"niacin":0,"pantothenicAcid":0,"vitaminB6":0,"folate":0,"vitaminB12":0,"choline":0}'::jsonb
FROM "Meal" m, own_plans p
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."title" LIKE 'Rest Day%'
  AND f."name" = 'Iodized Salt'
  AND f."quantity" = '¼ tsp (1.5 g)';

-- The carrot sits just before the salt, the way the rest day lists them.
CREATE TEMP TABLE carrot_slot AS
SELECT DISTINCT ON (m."planId")
  m."planId",
  m."id" AS "mealId",
  (SELECT min(f."order") FROM "Food" f WHERE f."mealId" = m."id" AND lower(f."name") LIKE '%salt%') AS "before"
FROM "Meal" m
JOIN own_plans p ON p."id" = m."planId"
WHERE NOT EXISTS (
  SELECT 1 FROM "Food" f
  JOIN "Meal" m2 ON m2."id" = f."mealId"
  WHERE m2."planId" = m."planId" AND lower(btrim(f."name")) LIKE 'carrot%'
)
ORDER BY m."planId", (m."name" = 'Burrito ×2') DESC, m."order" DESC, m."id";

UPDATE "Food" f
SET "order" = f."order" + 1
FROM carrot_slot s
WHERE f."mealId" = s."mealId"
  AND f."order" >= s."before";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_carrot_' || s."mealId",
  s."mealId",
  'Carrot',
  '1 medium (61 g)',
  25, 1, 6, 0,
  COALESCE(s."before", (SELECT max(f."order") FROM "Food" f WHERE f."mealId" = s."mealId") + 1, 1),
  61,
  128,
  '{"fiber":1.71,"sugar":2.89,"addedSugar":0,"satFat":0.02,"transFat":0,"monoFat":0.01,"polyFat":0.06,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.06,"cholesterol":0,"sodium":42.09,"potassium":195.2,"calcium":20.13,"iron":0.18,"magnesium":7.32,"zinc":0.15,"iodine":0.37,"phosphorus":21.35,"copper":0.03,"manganese":0.09,"selenium":0.06,"vitaminA":509.35,"vitaminC":3.6,"vitaminD":0,"vitaminE":0.4,"vitaminK":8.05,"thiamin":0.04,"riboflavin":0.04,"niacin":0.6,"pantothenicAcid":0.17,"vitaminB6":0.08,"folate":11.59,"vitaminB12":0,"choline":5.37}'::jsonb
FROM carrot_slot s
ON CONFLICT DO NOTHING;

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

DROP TABLE carrot_slot;
DROP TABLE own_plans;
