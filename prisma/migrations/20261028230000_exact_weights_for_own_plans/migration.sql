-- Data migration: two stored measures in one coach's own plans and log that
-- made the unit menu on a food read a different amount from the one written.
--
--   - "Black beans, rinsed" carries 240 g a cup: USDA's weight for canned
--     black beans with their liquid (175188), which is where the row's numbers
--     came from. Drained and rinsed they weigh what cooked beans do, 172 g a
--     cup (173735), so 120 g read as "½ cup" when it is 0.7.
--   - Salt saved at ⅛ tsp, back when weights were kept to a tenth of a gram
--     and labels to a whole one: the catalog's 6 g teaspoon makes ⅛ tsp 0.75 g,
--     which was stored as 0.8 and written "(1 g)". The menu then read 0.8 g
--     back as "0.13 tsp". Its nutrients were scaled by servings, not grams, so
--     they are already right and stay as they are.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email, only the coach's own plans (library, or assigned to themselves) and
-- their own log are touched, and each UPDATE matches only the old value, so a
-- re-deploy, or any other database, finds nothing to change.

UPDATE "Food" f
SET "gramsPerCup" = 172
FROM "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = 'Black beans, rinsed'
  AND f."gramsPerCup" = 240;

UPDATE "LoggedFood" lf
SET "gramsPerCup" = 172
FROM "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Black beans, rinsed'
  AND lf."gramsPerCup" = 240;

UPDATE "Food" f
SET "quantity" = '⅛ tsp (0.75 g)', "grams" = 0.75
FROM "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" IN ('Iodized Salt', 'Sea Salt, Not Iodized')
  AND f."quantity" = '⅛ tsp (1 g)';

UPDATE "LoggedFood" lf
SET "quantity" = '⅛ tsp (0.75 g)', "grams" = 0.75
FROM "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" IN ('Iodized Salt', 'Sea Salt, Not Iodized')
  AND lf."quantity" = '⅛ tsp (1 g)';
