-- Data migration: a second medium carrot in one coach's breakfast smoothie.
-- Nearly all their vitamin A is beta-carotene they have to convert (no eggs,
-- liver or oily fish), and one carrot left them at 86% of the daily value;
-- two take it to about 143% for 25 kcal, with potassium, fibre and
-- alpha-carotene along with it.
--
-- The row is doubled the way the builder's servings box writes it —
-- "2 × 1 medium (61 g)", macros, weight and micronutrients all ×2 — so the
-- builder reopens it as two servings of the same preset. Same safety rules as
-- the plan migrations before it: owner by email, only the coach's own plans
-- (library, or assigned to themselves), and the carrot matched by name AND
-- exact amount in breakfast, where 20261027211516 put it.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE changed ("planId" TEXT);

WITH doubled AS (
  UPDATE "Food" f
  SET
    "quantity" = '2 × 1 medium (61 g)',
    "calories" = f."calories" * 2,
    "protein"  = f."protein" * 2,
    "carbs"    = f."carbs" * 2,
    "fat"      = f."fat" * 2,
    "grams"    = f."grams" * 2,
    "nutrients" = (
      SELECT jsonb_object_agg(
        e.key,
        CASE WHEN jsonb_typeof(e.value) = 'number'
          THEN to_jsonb(round((e.value #>> '{}')::numeric * 2, 2))
          ELSE e.value
        END)
      FROM jsonb_each(f."nutrients") e
    )
  FROM "Meal" m
  WHERE f."mealId" = m."id"
    AND m."planId" IN (SELECT "id" FROM own_plans)
    AND m."name" = 'Breakfast'
    AND f."name" = 'Carrot'
    AND f."quantity" = '1 medium (61 g)'
  RETURNING m."planId"
)
INSERT INTO changed SELECT "planId" FROM doubled;

UPDATE "NutritionPlan" p
SET "notes" = replace(p."notes", 'The carrot goes in the smoothie;', 'Both carrots go in the smoothie;')
WHERE p."id" IN (SELECT "planId" FROM changed);

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
  WHERE m."planId" IN (SELECT "planId" FROM changed)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE changed;
DROP TABLE own_plans;
