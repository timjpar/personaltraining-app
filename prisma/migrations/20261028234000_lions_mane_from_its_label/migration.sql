-- Data migration: the lion's mane powder in one coach's own plans and log,
-- from the label on the bag instead of the raw mushroom dried on paper.
--
-- The label, per ⅓ tsp (2 g): 8 kcal, 0 g fat, 1 g carbohydrate, all of it
-- fibre, 0 g sugar, 1 g protein, 0 mg cholesterol and sodium, 0 µg vitamin D,
-- 0 mg calcium, 0.4 mg iron, 40 mg potassium. The stand-in (USDA Foundation
-- 1999626 scaled to dry matter, from 20261027221723_lions_mane_powder) had
-- 6 kcal, 0 g protein, 0.11 mg iron and 70 mg potassium.
--
--   - Every figure the label prints replaces the stored one.
--   - The rest stay: magnesium, zinc, phosphorus, the B vitamins and the like
--     are USDA's for this same mushroom, which the label neither states nor
--     contradicts.
--   - The label's ⅓ tsp to 2 g gives the powder a density, 6 g a teaspoon, so
--     the amount menu can offer teaspoons.
--
-- The ticked-off copies in the coach's log get the same, so a day already
-- logged reads like the plan it came from.
--
-- Each plan this changes has its targets and title re-totalled from its foods,
-- as 20261027221723_lions_mane_powder did. That also takes in the fish oil's
-- 18 → 20 kcal from 20261028233000_fish_oil_from_its_label, which left those
-- plans 2 kcal over their own targets.
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

WITH labelled AS (
  UPDATE "Food" f
  SET
    "calories"    = 8,
    "protein"     = 1,
    "carbs"       = 1,
    "fat"         = 0,
    "gramsPerCup" = 288,
    "nutrients"   = COALESCE(f."nutrients", '{}'::jsonb)
      || '{"fiber":1,"sugar":0,"addedSugar":0,"satFat":0,"transFat":0,"cholesterol":0,"sodium":0,"vitaminD":0,"calcium":0,"iron":0.4,"potassium":40}'::jsonb
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Lion''s mane powder'
    AND f."quantity" = '2 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM labelled;

-- The plans the fish oil changed, so their targets catch up too.
INSERT INTO changed
SELECT m."planId"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" = 'Fish oil'
  AND f."quantity" = '2 caps'
  AND f."calories" = 20;

UPDATE "LoggedFood" lf
SET
  "calories"    = 8,
  "protein"     = 1,
  "carbs"       = 1,
  "fat"         = 0,
  "gramsPerCup" = 288,
  "nutrients"   = COALESCE(lf."nutrients", '{}'::jsonb)
    || '{"fiber":1,"sugar":0,"addedSugar":0,"satFat":0,"transFat":0,"cholesterol":0,"sodium":0,"vitaminD":0,"calcium":0,"iron":0.4,"potassium":40}'::jsonb
FROM "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Lion''s mane powder'
  AND lf."quantity" = '2 g';

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
