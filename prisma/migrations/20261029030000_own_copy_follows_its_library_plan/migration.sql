-- Data migration: links one coach's own plan copies to the library plans they
-- were assigned from, then brings the copy they eat from back into line with
-- its library plan, now that 20261029025417_plan_copy_source keeps the two
-- together.
--
-- Copies made before that migration have no sourceId. This coach's library
-- plans are told apart by the name before " · " in their titles ("Training
-- Day", "Rest Day"); only the kcal after it ever changes, and a copy keeps the
-- name. So each of their own copies is linked to the one library plan of theirs
-- with that name, and left alone if there are none or several.
--
-- The current copy (newest assignedAt) and its library plan had drifted both
-- ways. The walnuts were moved into the smoothie in the library plan and never
-- reached the copy; the pre-workout blueberries were switched to frozen on the
-- copy and never reached the library plan. The switch goes to the library plan
-- first, as switchPlanFoodForm now does, its targets and title are re-totalled
-- from its foods, and then the copy is rewritten from it, as
-- updateNutritionTemplate now does on every save.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email and only their own plans are touched. A re-deploy finds everything
-- linked and nothing left to switch, and rewrites the copy to what it already is.

CREATE TEMP TABLE own AS
SELECT u."id"
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com';

UPDATE "NutritionPlan" c
SET "sourceId" = l."id"
FROM "NutritionPlan" l, own
WHERE c."trainerId" = own."id"
  AND c."clientId" = own."id"
  AND c."sourceId" IS NULL
  AND l."trainerId" = own."id"
  AND l."clientId" IS NULL
  AND split_part(l."title", ' · ', 1) = split_part(c."title", ' · ', 1)
  AND (
    SELECT count(*) FROM "NutritionPlan" o
    WHERE o."trainerId" = own."id"
      AND o."clientId" IS NULL
      AND split_part(o."title", ' · ', 1) = split_part(c."title", ' · ', 1)
  ) = 1;

-- The copy their day log reads, if it is one that follows a library plan.
CREATE TEMP TABLE cur AS
SELECT "id", "sourceId"
FROM (
  SELECT c."id", c."sourceId"
  FROM "NutritionPlan" c, own
  WHERE c."trainerId" = own."id" AND c."clientId" = own."id"
  ORDER BY c."assignedAt" DESC NULLS LAST
  LIMIT 1
) newest
WHERE "sourceId" IS NOT NULL;

-- The copy's frozen blueberries onto the library plan's row it was written
-- from: same meal, same place, still the fresh 100 g.
UPDATE "Food" lf
SET
  "name"        = cf."name",
  "quantity"    = cf."quantity",
  "calories"    = cf."calories",
  "protein"     = cf."protein",
  "carbs"       = cf."carbs",
  "fat"         = cf."fat",
  "grams"       = cf."grams",
  "gramsPerCup" = cf."gramsPerCup",
  "nutrients"   = cf."nutrients"
FROM cur, "Meal" cm, "Food" cf, "Meal" lm
WHERE cm."planId" = cur."id"
  AND cf."mealId" = cm."id"
  AND lm."planId" = cur."sourceId"
  AND lf."mealId" = lm."id"
  AND lm."name" = cm."name"
  AND lf."order" = cf."order"
  AND cm."name" = 'Pre-workout'
  AND lf."name" = 'Blueberries'
  AND lf."quantity" = '100 g'
  AND cf."name" = 'Blueberries, Frozen';

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
  WHERE m."planId" IN (SELECT "sourceId" FROM cur)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

-- The copy, rewritten from its library plan. Ids are derived from the copy's
-- and the source row's, so a re-run writes the same rows again.
DELETE FROM "Meal" WHERE "planId" IN (SELECT "id" FROM cur);

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'meal_' || md5(cur."id" || m."id"), cur."id", m."name", m."notes", m."order"
FROM cur
JOIN "Meal" m ON m."planId" = cur."sourceId";

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "groupName", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_' || md5(cur."id" || f."id"),
  'meal_' || md5(cur."id" || m."id"),
  f."name", f."quantity", f."calories", f."protein", f."carbs", f."fat",
  f."order", f."groupName", f."grams", f."gramsPerCup", f."nutrients"
FROM cur
JOIN "Meal" m ON m."planId" = cur."sourceId"
JOIN "Food" f ON f."mealId" = m."id";

UPDATE "NutritionPlan" c
SET
  "title"          = l."title",
  "notes"          = l."notes",
  "targetCalories" = l."targetCalories",
  "targetProtein"  = l."targetProtein",
  "targetCarbs"    = l."targetCarbs",
  "targetFat"      = l."targetFat",
  "updatedAt"      = NOW()
FROM cur, "NutritionPlan" l
WHERE c."id" = cur."id"
  AND l."id" = cur."sourceId";

DROP TABLE cur;
DROP TABLE own;
