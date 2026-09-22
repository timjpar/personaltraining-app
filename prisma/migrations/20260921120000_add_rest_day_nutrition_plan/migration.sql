-- Data migration, not a schema change: loads a rest-day nutrition plan for one
-- coach and assigns it to them, which makes it their current plan.
--
-- A migration because production credentials are not reachable from a
-- developer machine, and `build` runs `prisma migrate deploy`. Same safety rules
-- as 20260819131500_add_strength_split_workouts: fixed ids with untargeted
-- ON CONFLICT DO NOTHING so a re-deploy is a no-op, the owner resolved by a
-- SELECT over "User" so a missed match writes nothing instead of failing the
-- build, and child rows joined to their parent ids so they cannot outlive it.
--
-- Two copies, as the app writes for a coach who assigns to themselves: the
-- library template (clientId null) and the assigned snapshot (clientId = the
-- coach, assignedAt set). The food list is the training day minus the
-- pre-workout blueberries and one serving of rice.

INSERT INTO "NutritionPlan" ("id", "title", "notes", "targetCalories", "targetProtein", "targetCarbs", "targetFat", "assignedAt", "createdAt", "updatedAt", "trainerId", "clientId")
SELECT
  v."id",
  'Rest Day · 2,443 kcal',
  'Two burritos, built the same — the burrito quantities below cover both (539 kcal each).',
  2443, 198, 219, 91,
  CASE WHEN v."live" THEN NOW() END,
  NOW(),
  NOW(),
  u."id",
  CASE WHEN v."live" THEN u."id" END
FROM "User" u
JOIN (VALUES ('nplan_rest_lib', false), ('nplan_rest_live', true)) AS v("id", "live") ON TRUE
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND u."role" = 'TRAINER'
ON CONFLICT DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "order")
SELECT p."id" || '_m' || m."order", p."id", m."name", m."order"
FROM "NutritionPlan" p
JOIN (VALUES
  (1, 'Breakfast'),
  (2, 'Protein shake'),
  (3, 'Burrito ×2')
) AS m("order", "name") ON TRUE
WHERE p."id" IN ('nplan_rest_lib', 'nplan_rest_live')
ON CONFLICT DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT ml."id" || '_f' || f."order", ml."id", f."name", f."quantity", f."calories", f."protein", f."carbs", f."fat", f."order"
FROM "Meal" ml
JOIN (VALUES
  (1,  1, 'Rolled oats',            '1 cup dry (80 g)',    300, 10, 54,  6),
  (1,  2, 'Avocado',                '1 whole medium',      240,  3, 13, 22),
  (1,  3, 'Skotidakis yogurt',      '⅔ cup (170 g)',       200, 16,  7, 12),
  (1,  4, 'Hemp hearts',            '20 g',                120,  7,  2, 10),
  (1,  5, 'Walnuts',                '15 g',                100,  2,  2, 10),
  (1,  6, 'Chia seeds',             '20 g',                 98,  3,  8,  7),
  (1,  7, 'Blueberries',            '100 g',                57,  1, 14,  0),
  (1,  8, 'Broccoli, steamed',      '150 g',                51,  5, 10,  0),
  (1,  9, 'Kiwi, skin on',          '1 medium',             42,  1, 10,  0),
  (1, 10, 'Fish oil',               '2 caps',               18,  0,  0,  2),
  (1, 11, 'Lion''s mane',           '2 g',                   8,  0,  2,  0),
  (1, 12, 'Lemon water',            '½ lemon',               8,  0,  3,  0),
  (1, 13, 'Matcha',                 '1 serving',             3,  0,  1,  0),
  (1, 14, 'Creatine, D3 + K2',      '5 g creatine',          0,  0,  0,  0),
  (2,  1, 'Gold Standard whey',     '1 scoop',             120, 24,  3,  2),
  (3,  1, 'Chicken breast, cooked', '2 × 150 g (300 g)',   496, 93,  0, 11),
  (3,  2, 'Jasmine rice, cooked',   '2 × 84 g (168 g)',    202,  4, 44,  0),
  (3,  3, 'Black beans',            '2 × 120 g (240 g)',   200, 13, 36,  1),
  (3,  4, 'Real Good tortilla',     '2 × 1 tortilla',      180, 16, 10,  8)
) AS f("meal", "order", "name", "quantity", "calories", "protein", "carbs", "fat")
  ON ml."id" = ml."planId" || '_m' || f."meal"
WHERE ml."planId" IN ('nplan_rest_lib', 'nplan_rest_live')
ON CONFLICT DO NOTHING;
