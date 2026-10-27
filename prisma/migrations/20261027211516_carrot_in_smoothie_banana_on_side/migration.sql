-- Data migration: one coach blends the carrot into the breakfast smoothie
-- instead of eating it with the burritos, and eats the banana whole on the
-- side. Blending breaks the cell walls that hold the carrot's beta-carotene,
-- and the breakfast fats carry it; banana's polyphenol oxidase, blended with
-- the berries, cuts the flavanols absorbed from them.
--
-- The carrot row moves meals as it is (same id, amount and nutrients) and sits
-- right after the broccoli, so daily totals, titles and targets don't change.
-- The banana gets a sentence in the plan notes, the one place a plan's reader
-- always sees. Same safety rules as the plan migrations before it: owner by
-- email, only the coach's own plans (library, or assigned to themselves), and
-- the carrot matched by name AND exact amount as read off chalkline.click on
-- 2026-10-27, so a row edited since is left alone.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

CREATE TEMP TABLE carrot_move AS
SELECT
  f."id" AS "foodId",
  m."planId",
  b."id" AS "breakfastId",
  COALESCE(
    (SELECT min(o."order") FROM "Food" o WHERE o."mealId" = b."id" AND o."name" = 'Broccoli, steamed'),
    (SELECT max(o."order") FROM "Food" o WHERE o."mealId" = b."id"),
    0
  ) AS "after"
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
JOIN LATERAL (
  SELECT x."id" FROM "Meal" x
  WHERE x."planId" = m."planId" AND x."name" = 'Breakfast'
  ORDER BY x."order", x."id"
  LIMIT 1
) b ON TRUE
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND m."name" = 'Burrito ×2'
  AND f."name" = 'Carrot'
  AND f."quantity" = '1 medium (61 g)';

UPDATE "Food" f
SET "order" = f."order" + 1
FROM carrot_move c
WHERE f."mealId" = c."breakfastId"
  AND f."order" > c."after";

UPDATE "Food" f
SET "mealId" = c."breakfastId", "order" = c."after" + 1
FROM carrot_move c
WHERE f."id" = c."foodId";

UPDATE "NutritionPlan" p
SET
  "notes" = COALESCE(p."notes" || ' ', '') ||
    'The carrot goes in the smoothie; eat the banana whole on the side — blended, its browning enzyme cuts the polyphenols you absorb from the berries.',
  "updatedAt" = p."updatedAt" + (NOW()::timestamp - (
    SELECT max(c."updatedAt") FROM "NutritionPlan" c WHERE c."id" IN (SELECT "planId" FROM carrot_move)
  ))
WHERE p."id" IN (SELECT "planId" FROM carrot_move)
  AND COALESCE(p."notes", '') NOT LIKE '%banana whole on the side%';

DROP TABLE carrot_move;
DROP TABLE own_plans;
