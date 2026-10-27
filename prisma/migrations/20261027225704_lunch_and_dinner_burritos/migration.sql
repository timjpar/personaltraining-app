-- Data migration: one coach eats the two burritos apart, one at lunch and one at
-- dinner, so the "Burrito ×2" meal in each of their own plans becomes two
-- meals, "Lunch" and "Dinner", each holding one burrito. The day's protein then
-- arrives in four feedings (about 46, 29, 63 and 63 g) rather than three, and
-- the check-off can tick each burrito when it's eaten.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own plans (library, or assigned to themselves), and every row matched
-- by name AND exact amount as read off chalkline.click on 2026-10-27. A burrito
-- meal is split only if every row in it is one of those, so a meal edited since
-- is left whole. Logged days are not touched.
--
-- The existing meal is renamed and halved in place, keeping its ids; Dinner is
-- a copy of it inserted right after, with the meals behind it moved down one.
-- The macros are whole numbers, so an odd one can't halve exactly: it rounds to
-- the even neighbour (93 g → 46, 11 g → 6), which keeps the two burritos
-- identical and moves the day's totals by a gram or two in either direction
-- rather than always up. Micronutrients and weights halve exactly.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

-- Each row of "Burrito ×2" as it reads today, and what one burrito's worth reads.
CREATE TEMP TABLE one_burrito ("name" TEXT, "two" TEXT, "one" TEXT);
INSERT INTO one_burrito VALUES
  ('Chicken breast, cooked', '2 × 150 g (300 g)', '150 g'),
  ('Jasmine rice, cooked',   '2 × 126 g (252 g)', '126 g'),
  ('Jasmine rice, cooked',   '2 × 63 g (126 g)',  '63 g'),
  ('Black beans, rinsed',    '2 × 120 g (240 g)', '120 g'),
  ('Black beans, rinsed',    '2 × 90 g (180 g)',  '90 g'),
  ('Real Good tortilla',     '2 × 1 tortilla',    '1 tortilla'),
  ('Iodized Salt',           '¼ tsp (1.5 g)',     '⅛ tsp (0.75 g)');

CREATE TEMP TABLE burrito AS
SELECT m."id", m."planId", m."order"
FROM "Meal" m
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND m."name" = 'Burrito ×2'
  AND EXISTS (SELECT 1 FROM "Food" f WHERE f."mealId" = m."id")
  AND NOT EXISTS (
    SELECT 1 FROM "Food" f
    WHERE f."mealId" = m."id"
      AND NOT EXISTS (
        SELECT 1 FROM one_burrito o WHERE o."name" = f."name" AND o."two" = f."quantity"
      )
  );

-- Halve in place. For a whole number n, n / 2 rounded half to even is n / 2
-- (integer division) plus one exactly when n leaves 3 over 4.
UPDATE "Food" f
SET
  "quantity"  = o."one",
  "calories"  = f."calories" / 2 + (f."calories" % 4 = 3)::int,
  "protein"   = f."protein"  / 2 + (f."protein"  % 4 = 3)::int,
  "carbs"     = f."carbs"    / 2 + (f."carbs"    % 4 = 3)::int,
  "fat"       = f."fat"      / 2 + (f."fat"      % 4 = 3)::int,
  "grams"     = f."grams" / 2,
  "nutrients" = (
    SELECT jsonb_object_agg(e.key, round(e.value::text::numeric / 2, 2)::float8)
    FROM jsonb_each(f."nutrients") e
  )
FROM burrito b, one_burrito o
WHERE f."mealId" = b."id"
  AND o."name" = f."name"
  AND o."two" = f."quantity";

UPDATE "Meal" m
SET "order" = m."order" + 1
FROM burrito b
WHERE m."planId" = b."planId"
  AND m."order" > b."order";

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'meal_dinner_' || m."id", m."planId", 'Dinner', m."notes", m."order" + 1
FROM "Meal" m
JOIN burrito b ON b."id" = m."id"
ON CONFLICT DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "groupName", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_dinner_' || f."id", 'meal_dinner_' || f."mealId",
  f."name", f."quantity", f."calories", f."protein", f."carbs", f."fat",
  f."order", f."groupName", f."grams", f."gramsPerCup", f."nutrients"
FROM "Food" f
JOIN burrito b ON b."id" = f."mealId"
ON CONFLICT DO NOTHING;

UPDATE "Meal" m
SET "name" = 'Lunch'
FROM burrito b
WHERE m."id" = b."id";

-- The note said the burrito rows covered both; each meal now holds one.
UPDATE "NutritionPlan" p
SET "notes" = regexp_replace(p."notes",
  'Two burritos, built the same — the burrito quantities below cover both \(\d[\d,]* kcal each\)\.',
  'Lunch and dinner are the same burrito.')
WHERE p."id" IN (SELECT "planId" FROM burrito);

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
    SELECT max(c."updatedAt") FROM "NutritionPlan" c WHERE c."id" IN (SELECT "planId" FROM burrito)
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
  WHERE m."planId" IN (SELECT "planId" FROM burrito)
  GROUP BY m."planId"
) t
WHERE t."planId" = p."id";

DROP TABLE burrito;
DROP TABLE one_burrito;
DROP TABLE own_plans;
