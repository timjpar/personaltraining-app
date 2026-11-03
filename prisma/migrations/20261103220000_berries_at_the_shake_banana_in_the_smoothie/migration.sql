-- Data migration: in one coach's own plans, every blueberry goes to the whey
-- shake ("Pre-workout", or "Protein shake" on rest days) and the banana goes
-- into the breakfast smoothie.
--
-- Breakfast's smoothie and the shake each held 100 g of blueberries. Moving
-- them keeps the day's total: the shake's row absorbs any other blueberry row
-- in the plan (grams, macros and micronutrients added together; a nutrient
-- either row doesn't know is dropped, since the sum would be unknown), and the
-- other row is deleted, so a meal never lists the same food twice (log
-- check-offs key on meal and food name). The banana, eaten whole beside the
-- shake so its browning enzyme couldn't meet the berries, can go in the
-- smoothie now that the smoothie has no berries left; it goes at the end of
-- the smoothie's group. Nothing is added or removed, so targets and titles
-- don't move.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email and only the coach's own plans (library, or assigned to themselves)
-- are touched. Each step finds nothing left to do on a re-deploy. Logged days
-- stay as eaten.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

-- Each plan's shake: the meal that holds the whey.
CREATE TEMP TABLE shake AS
SELECT DISTINCT ON (m."planId") m."planId", m."id" AS "mealId"
FROM "Meal" m
JOIN "Food" f ON f."mealId" = m."id"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" ILIKE '%whey%'
ORDER BY m."planId", m."name" IN ('Pre-workout', 'Protein shake') DESC, m."order", m."id";

-- Each plan's smoothie: breakfast's group named "Smoothie".
CREATE TEMP TABLE smoothie AS
SELECT DISTINCT ON (m."planId") m."planId", m."id" AS "mealId", f."groupName", f."order"
FROM "Meal" m
JOIN "Food" f ON f."mealId" = m."id"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND m."name" = 'Breakfast'
  AND lower(btrim(f."groupName")) = 'smoothie'
ORDER BY m."planId", f."order" DESC;

-- Blueberries: the shake's own row, and every other blueberry row in the plan.
CREATE TEMP TABLE keep AS
SELECT DISTINCT ON (s."planId") s."planId", f."id", COALESCE(f."grams", substring(f."quantity" from '^([0-9]+(?:\.[0-9]+)?) g$')::float) AS "g"
FROM shake s
JOIN "Food" f ON f."mealId" = s."mealId"
WHERE f."name" = 'Blueberries'
ORDER BY s."planId", f."order", f."id";

CREATE TEMP TABLE others AS
SELECT k."planId", k."id" AS "keepId", f."id", COALESCE(f."grams", substring(f."quantity" from '^([0-9]+(?:\.[0-9]+)?) g$')::float) AS "grams", f."calories", f."protein", f."carbs", f."fat", f."nutrients"
FROM keep k
JOIN "Meal" m ON m."planId" = k."planId"
JOIN "Food" f ON f."mealId" = m."id"
WHERE f."name" = 'Blueberries'
  AND f."id" <> k."id"
  AND k."g" IS NOT NULL
  AND COALESCE(f."grams", substring(f."quantity" from '^([0-9]+(?:\.[0-9]+)?) g$')::float) IS NOT NULL;

UPDATE "Food" f
SET
  "grams"    = k."g" + o."grams",
  "quantity" = rtrim(to_char(k."g" + o."grams", 'FM999999.99'), '.') || ' g',
  "calories" = f."calories" + o."calories",
  "protein"  = f."protein" + o."protein",
  "carbs"    = f."carbs" + o."carbs",
  "fat"      = f."fat" + o."fat",
  "nutrients" = (
    SELECT jsonb_object_agg(a.key, round(((a.value)::numeric + (b.value)::numeric), 2))
    FROM jsonb_each_text(f."nutrients") a
    JOIN jsonb_each_text(o."nutrients") b ON b.key = a.key
  )
FROM (
  SELECT "keepId",
    sum("grams") AS "grams", sum("calories") AS "calories", sum("protein") AS "protein",
    sum("carbs") AS "carbs", sum("fat") AS "fat",
    -- One other row in practice; with several, add their nutrients first.
    (SELECT jsonb_object_agg(e.key, e.total) FROM (
       SELECT x.key, round(sum((x.value)::numeric), 2) AS total, count(*) AS n
       FROM others o2, jsonb_each_text(o2."nutrients") x
       WHERE o2."keepId" = o1."keepId"
       GROUP BY x.key
     ) e WHERE e.n = (SELECT count(*) FROM others o3 WHERE o3."keepId" = o1."keepId")) AS "nutrients"
  FROM others o1
  GROUP BY "keepId"
) o
JOIN keep k ON k."id" = o."keepId"
WHERE f."id" = o."keepId";

-- The rows added in go. A row with no gram weight, on either side, was never
-- in "others" and stays where it is.
DELETE FROM "Food" f
USING others o
WHERE f."id" = o."id";

-- Banana: from the shake to the end of the smoothie group.
UPDATE "Food" f
SET "order" = f."order" + 1
FROM smoothie sm
WHERE f."mealId" = sm."mealId"
  AND f."order" > sm."order"
  AND EXISTS (
    SELECT 1 FROM shake s JOIN "Food" b ON b."mealId" = s."mealId"
    WHERE s."planId" = sm."planId" AND b."name" = 'Banana'
  );

UPDATE "Food" f
SET "mealId" = sm."mealId", "groupName" = sm."groupName", "order" = sm."order" + 1
FROM shake s
JOIN smoothie sm ON sm."planId" = s."planId"
WHERE f."mealId" = s."mealId"
  AND f."name" = 'Banana';

UPDATE "NutritionPlan" p
SET "notes" = replace(p."notes",
  'The oat milk goes in the whey shake; eat the banana whole beside it — blended with the blueberries, its browning enzyme cuts the polyphenols you absorb from them.',
  'The oat milk and all the blueberries go in the whey shake, and the banana goes in the smoothie: kept apart, the banana''s browning enzyme can''t cut the polyphenols you absorb from the berries.')
WHERE p."id" IN (SELECT "id" FROM own_plans);

DROP TABLE others;
DROP TABLE keep;
DROP TABLE smoothie;
DROP TABLE shake;
DROP TABLE own_plans;
