-- Data migration: one coach's Rest Day gets the groups their Training Day
-- already has, so the day log's check-off shows the smoothie, the yogurt, the
-- tea and the rest as one box each, ticked in one go. The foods are the same
-- eighteen breakfast items, the same shake and the same two burritos; Rest Day
-- just lists them in the order they were added, so each group's foods are also
-- moved next to each other, in Training Day's order. Creatine stays loose at
-- the end of breakfast — on a rest day it isn't part of a shake.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own plans (library, or assigned to themselves), and every row matched
-- by meal, name AND exact amount as read off chalkline.click on 2026-10-28. A
-- plan is changed only if it holds exactly these thirty-two foods and none of
-- them is grouped yet, so a Rest Day edited since, or grouped by hand, is left
-- alone. Training Day has a "Pre-workout" meal rather than "Protein shake", so
-- it never matches. Nothing is added or removed, so totals and titles stay put.
-- Logged days are not touched.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

-- Every Rest Day row as it reads today, where it should sit, and its group.
CREATE TEMP TABLE rest_day ("meal" TEXT, "name" TEXT, "quantity" TEXT, "order" INT, "groupName" TEXT);
INSERT INTO rest_day VALUES
  ('Breakfast', 'Rolled oats',                            '½ cup dry (40 g)',    1, 'Smoothie'),
  ('Breakfast', 'Sunflower Seeds',                        '28 g',                2, 'Smoothie'),
  ('Breakfast', 'Blueberries',                            '100 g',               3, 'Smoothie'),
  ('Breakfast', 'Carrot',                                 '2 × 1 medium (61 g)', 4, 'Smoothie'),
  ('Breakfast', 'Kiwi, skin on',                          '1 medium',            5, 'Smoothie'),
  ('Breakfast', 'Skotidakis yogurt',                      '⅔ cup (170 g)',       6, 'yogurt'),
  ('Breakfast', 'Hemp hearts',                            '20 g',                7, 'yogurt'),
  ('Breakfast', 'Broccoli, steamed',                      '150 g',               8, 'cooked'),
  ('Breakfast', 'Lion''s mane powder',                    '2 g',                 9, 'Tea'),
  ('Breakfast', 'Matcha',                                 '1 serving',          10, 'Tea'),
  ('Breakfast', 'Clementine',                             '1 medium (74 g)',    11, 'Tea'),
  ('Breakfast', 'Lemon juice',                            '1½ tbsp (23 g)',     12, 'chia seed soak'),
  ('Breakfast', 'Chia seeds',                             '10 g',               13, 'chia seed soak'),
  ('Breakfast', 'Olive Oil',                              '1 tbsp (14 g)',      14, 'shots'),
  ('Breakfast', 'Sports Research D3 + K2',                '1 softgel',          15, 'shots'),
  ('Breakfast', 'Fish oil',                               '2 caps',             16, 'shots'),
  ('Breakfast', 'Wholly smashed avocado (nothing added)', '1 mini (57 g)',      17, 'shots'),
  ('Breakfast', 'Creatine Monohydrate',                   '5 g',                18, NULL),
  ('Protein shake', 'Gold Standard whey',                 '1 scoop',             1, 'shake'),
  ('Protein shake', 'Kirkland organic oat milk',          '1 cup (240 ml)',      2, 'shake'),
  ('Protein shake', 'Blueberries',                        '100 g',               3, 'shots but not together'),
  ('Protein shake', 'Banana',                             '1 medium (118 g)',    4, 'shots but not together'),
  ('Lunch',  'Chicken breast, cooked', '150 g',          1, 'burrito 1'),
  ('Lunch',  'Jasmine rice, cooked',   '126 g',          2, 'burrito 1'),
  ('Lunch',  'Black beans, rinsed',    '120 g',          3, 'burrito 1'),
  ('Lunch',  'Real Good tortilla',     '1 tortilla',     4, 'burrito 1'),
  ('Lunch',  'Iodized Salt',           '⅛ tsp (0.75 g)', 5, 'burrito 1'),
  ('Dinner', 'Chicken breast, cooked', '150 g',          1, 'burrito 2'),
  ('Dinner', 'Jasmine rice, cooked',   '126 g',          2, 'burrito 2'),
  ('Dinner', 'Black beans, rinsed',    '120 g',          3, 'burrito 2'),
  ('Dinner', 'Real Good tortilla',     '1 tortilla',     4, 'burrito 2'),
  ('Dinner', 'Iodized Salt',           '⅛ tsp (0.75 g)', 5, 'burrito 2');

-- Exactly these rows: as many foods as the list, every listed row present, and
-- nothing grouped already.
CREATE TEMP TABLE rest_plans AS
SELECT o."id"
FROM own_plans o
WHERE (
    SELECT count(*) FROM "Meal" m JOIN "Food" f ON f."mealId" = m."id"
    WHERE m."planId" = o."id"
  ) = (SELECT count(*) FROM rest_day)
  AND NOT EXISTS (
    SELECT 1 FROM rest_day r
    WHERE NOT EXISTS (
      SELECT 1 FROM "Meal" m JOIN "Food" f ON f."mealId" = m."id"
      WHERE m."planId" = o."id"
        AND m."name" = r."meal"
        AND f."name" = r."name"
        AND f."quantity" = r."quantity"
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Meal" m JOIN "Food" f ON f."mealId" = m."id"
    WHERE m."planId" = o."id" AND f."groupName" IS NOT NULL
  );

UPDATE "Food" f
SET "groupName" = r."groupName",
    "order"     = r."order"
FROM "Meal" m, rest_day r
WHERE f."mealId" = m."id"
  AND m."planId" IN (SELECT "id" FROM rest_plans)
  AND r."meal" = m."name"
  AND r."name" = f."name"
  AND r."quantity" = f."quantity";

DROP TABLE rest_plans;
DROP TABLE rest_day;
DROP TABLE own_plans;
