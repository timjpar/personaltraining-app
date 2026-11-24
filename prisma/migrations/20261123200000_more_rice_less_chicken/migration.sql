-- Data migration: more rice and less chicken in each burrito of one coach's
-- plans, so carbs go up while calories stay where they are.
--
-- The coach asked for more carbs without adding calories. Protein was about
-- 2.4 g/kg, well past the ~1.6 g/kg where extra protein stops adding muscle
-- (Morton 2018), so chicken pays for the rice:
--
--   Chicken, in each burrito  120 g -> 60 g    -99 kcal, -18 g protein, -3 g fat
--   Rice, in each burrito     126 g -> 210 g   +101 kcal, +2 g protein,
--                                              +22 g carbs, +1 g fat
--
-- With two burritos that is +4 kcal, -32 g protein, +44 g carbs and -4 g fat
-- a day: carbs 292 -> 336 g, protein 186 -> 154 g (about 2.0 g/kg, and each
-- burrito still carries about 38 g).
--
-- Both rows are not catalog foods, so their macros come from the per-gram
-- numbers they were first written with (chicken: 496 kcal, 93 g protein, 11 g
-- fat per 300 g; rice: 404 kcal, 8 g protein, 88 g carbs, 1 g fat per 336 g),
-- rounded, and their nutrients scale from what each row holds now: x0.5 for
-- the chicken, x5/3 for the rice.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email, only the coach's own plans (library, or assigned to themselves) are
-- touched, and rows are matched on name and exact amount, so a re-deploy does
-- nothing. Logged days are left as they were eaten.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

WITH chicken AS (
  UPDATE "Food" f
  SET
    "quantity" = '60 g',
    "grams" = 60,
    "calories" = 99,
    "protein" = 19,
    "carbs" = 0,
    "fat" = 2,
    "nutrients" = (
      SELECT jsonb_object_agg(e.key, round((e.value)::numeric * 0.5, 2))
      FROM jsonb_each_text(f."nutrients") e
    )
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Chicken breast, cooked'
    AND f."quantity" = '120 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM chicken;

WITH rice AS (
  UPDATE "Food" f
  SET
    "quantity" = '210 g',
    "grams" = 210,
    "calories" = 253,
    "protein" = 5,
    "carbs" = 55,
    "fat" = 1,
    "nutrients" = (
      SELECT jsonb_object_agg(e.key, round((e.value)::numeric * 5 / 3, 2))
      FROM jsonb_each_text(f."nutrients") e
    )
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND f."name" = 'Jasmine rice, cooked'
    AND f."quantity" = '126 g'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM rice;

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
  SELECT m."planId",
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
