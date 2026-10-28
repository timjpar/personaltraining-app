-- Data migration: one coach's broccoli is frozen and weighed out of the bag,
-- so "Broccoli, steamed · 150 g" becomes the catalog's "Broccoli, Frozen ·
-- 150 g" in their own plans and log.
--
-- The old row was fresh broccoli, boiled (USDA 169967), at its cooked weight.
-- Frozen broccoli is blanched before it's frozen, which washes out some of its
-- vitamin C, folate and potassium, and it holds more water a gram. Weighed
-- frozen it also loses about 7% to the steamer, so 150 g of it is ~140 g on
-- the plate. The catalog entry is USDA 169968, frozen chopped broccoli as it
-- comes out of the bag — the weight this coach puts on the scale — and
-- steaming takes far less out of it than the boiling USDA's cooked entries
-- describe.
--
-- The numbers below are exactly what src/lib/food-presets.ts derives for 150 g
-- of "Broccoli, Frozen" (scalePreset), so the row reads back as that catalog
-- food: 39 kcal, 4 g protein, 7 g carbs, 0 g fat, against the old 51/5/10/0.
-- Being a catalog food also gives it the Fresh/Frozen switch on the plan row.
--
-- The ticked-off copies in the coach's log get the same, and each plan this
-- changes has its targets and title re-totalled from its foods, as
-- 20261028234000_lions_mane_from_its_label did.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email, only the coach's own plans (library, or assigned to themselves) and
-- their own log are touched, and rows are matched on name and exact amount.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

WITH frozen AS (
  UPDATE "Food" f
  SET
    "name"        = 'Broccoli, Frozen',
    "calories"    = 39,
    "protein"     = 4,
    "carbs"       = 7,
    "fat"         = 0,
    "grams"       = 150,
    "gramsPerCup" = 156,
    "nutrients"   = '{"fiber":4.5,"sugar":2.03,"satFat":0.07,"sodium":36,"cholesterol":0,"potassium":318,"calcium":84,"iron":1.21,"magnesium":27,"zinc":0.72,"vitaminA":78,"vitaminC":84.6,"vitaminD":0,"vitaminB12":0,"folate":100.5,"monoFat":0.03,"polyFat":0.2,"phosphorus":75,"copper":0.06,"manganese":0.44,"selenium":4.2,"vitaminE":1.83,"vitaminK":121.65,"thiamin":0.08,"riboflavin":0.14,"niacin":0.7,"vitaminB6":0.19,"choline":22.35,"pantothenicAcid":0.42,"transFat":0,"omega3Ala":0.15,"omega3Epa":0,"omega3Dha":0,"omega6La":0.05,"iodine":0.75,"chromium":0,"molybdenum":10.21,"biotin":12.06}'::jsonb
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Broccoli, steamed'
    AND f."quantity" = '150 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM frozen;

UPDATE "LoggedFood" lf
SET
  "name"        = 'Broccoli, Frozen',
  "calories"    = 39,
  "protein"     = 4,
  "carbs"       = 7,
  "fat"         = 0,
  "grams"       = 150,
  "gramsPerCup" = 156,
  "nutrients"   = '{"fiber":4.5,"sugar":2.03,"satFat":0.07,"sodium":36,"cholesterol":0,"potassium":318,"calcium":84,"iron":1.21,"magnesium":27,"zinc":0.72,"vitaminA":78,"vitaminC":84.6,"vitaminD":0,"vitaminB12":0,"folate":100.5,"monoFat":0.03,"polyFat":0.2,"phosphorus":75,"copper":0.06,"manganese":0.44,"selenium":4.2,"vitaminE":1.83,"vitaminK":121.65,"thiamin":0.08,"riboflavin":0.14,"niacin":0.7,"vitaminB6":0.19,"choline":22.35,"pantothenicAcid":0.42,"transFat":0,"omega3Ala":0.15,"omega3Epa":0,"omega3Dha":0,"omega6La":0.05,"iodine":0.75,"chromium":0,"molybdenum":10.21,"biotin":12.06}'::jsonb
FROM "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Broccoli, steamed'
  AND lf."quantity" = '150 g';

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
