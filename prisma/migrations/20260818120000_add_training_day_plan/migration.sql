-- Loads Tim's training-day meal plan into timmyjparsons@gmail.com.
--
-- A data migration, not a schema one: the production credentials are marked
-- Sensitive in Vercel, so a deploy is the only context that can reach the
-- database. Every insert is keyed to a fixed id and guarded by
-- ON CONFLICT DO NOTHING, so re-running is a no-op rather than a duplicate.
--
-- If no account matches the email, every statement below inserts zero rows
-- and the deploy still succeeds.

INSERT INTO "NutritionPlan" ("id", "title", "notes", "targetCalories", "targetProtein", "targetCarbs", "targetFat", "assignedAt", "createdAt", "updatedAt", "trainerId", "clientId")
SELECT 'seed_td_plan_lib', 'Training Day · 2,702 kcal', 'Two burritos, built the same — the burrito quantities below cover both (640 kcal each).', 2702, 205, 310, 88, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, u."id", NULL
FROM "User" u WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'seed_td_meal_lib_1', 'seed_td_plan_lib', 'Breakfast', NULL, 1
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" WHERE "id" = 'seed_td_plan_lib')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT * FROM (VALUES
  ('seed_td_food_lib_1_1', 'seed_td_meal_lib_1', 'Rolled oats', '1 cup dry (80 g)', 300, 10, 54, 6, 1),
  ('seed_td_food_lib_1_2', 'seed_td_meal_lib_1', 'Avocado', '1 whole medium', 240, 3, 13, 22, 2),
  ('seed_td_food_lib_1_3', 'seed_td_meal_lib_1', 'Skotidakis yogurt', '⅔ cup (170 g)', 200, 16, 7, 12, 3),
  ('seed_td_food_lib_1_4', 'seed_td_meal_lib_1', 'Hemp hearts', '20 g', 120, 7, 2, 10, 4),
  ('seed_td_food_lib_1_5', 'seed_td_meal_lib_1', 'Walnuts', '15 g', 100, 2, 2, 10, 5),
  ('seed_td_food_lib_1_6', 'seed_td_meal_lib_1', 'Chia seeds', '20 g', 98, 3, 8, 7, 6),
  ('seed_td_food_lib_1_7', 'seed_td_meal_lib_1', 'Blueberries', '100 g', 57, 1, 14, 0, 7),
  ('seed_td_food_lib_1_8', 'seed_td_meal_lib_1', 'Broccoli, steamed', '150 g', 51, 5, 10, 0, 8),
  ('seed_td_food_lib_1_9', 'seed_td_meal_lib_1', 'Kiwi, skin on', '1 medium', 42, 1, 10, 0, 9),
  ('seed_td_food_lib_1_10', 'seed_td_meal_lib_1', 'Fish oil', '2 caps', 18, 0, 0, 2, 10),
  ('seed_td_food_lib_1_11', 'seed_td_meal_lib_1', 'Lion''s mane', '2 g', 8, 0, 2, 0, 11),
  ('seed_td_food_lib_1_12', 'seed_td_meal_lib_1', 'Lemon water', '½ lemon', 8, 0, 3, 0, 12),
  ('seed_td_food_lib_1_13', 'seed_td_meal_lib_1', 'Matcha', '1 serving', 3, 0, 1, 0, 13),
  ('seed_td_food_lib_1_14', 'seed_td_meal_lib_1', 'Creatine, D3 + K2', '5 g creatine', 0, 0, 0, 0, 14)
) AS v("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
WHERE EXISTS (SELECT 1 FROM "Meal" WHERE "id" = 'seed_td_meal_lib_1')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'seed_td_meal_lib_2', 'seed_td_plan_lib', 'Pre-workout', NULL, 2
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" WHERE "id" = 'seed_td_plan_lib')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT * FROM (VALUES
  ('seed_td_food_lib_2_1', 'seed_td_meal_lib_2', 'Gold Standard whey', '1 scoop', 120, 24, 3, 2, 1),
  ('seed_td_food_lib_2_2', 'seed_td_meal_lib_2', 'Blueberries', '100 g', 57, 1, 14, 0, 2)
) AS v("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
WHERE EXISTS (SELECT 1 FROM "Meal" WHERE "id" = 'seed_td_meal_lib_2')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'seed_td_meal_lib_3', 'seed_td_plan_lib', 'Burrito ×2', NULL, 3
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" WHERE "id" = 'seed_td_plan_lib')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT * FROM (VALUES
  ('seed_td_food_lib_3_1', 'seed_td_meal_lib_3', 'Chicken breast, cooked', '2 × 150 g (300 g)', 496, 93, 0, 11, 1),
  ('seed_td_food_lib_3_2', 'seed_td_meal_lib_3', 'Jasmine rice, cooked', '2 × 168 g (336 g)', 404, 8, 88, 1, 2),
  ('seed_td_food_lib_3_3', 'seed_td_meal_lib_3', 'Black beans', '2 × 120 g (240 g)', 200, 13, 36, 1, 3),
  ('seed_td_food_lib_3_4', 'seed_td_meal_lib_3', 'Real Good tortilla', '2 × 1 tortilla', 180, 16, 10, 8, 4)
) AS v("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
WHERE EXISTS (SELECT 1 FROM "Meal" WHERE "id" = 'seed_td_meal_lib_3')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "NutritionPlan" ("id", "title", "notes", "targetCalories", "targetProtein", "targetCarbs", "targetFat", "assignedAt", "createdAt", "updatedAt", "trainerId", "clientId")
SELECT 'seed_td_plan_live', 'Training Day · 2,702 kcal', 'Two burritos, built the same — the burrito quantities below cover both (640 kcal each).', 2702, 205, 310, 88, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, u."id", u."id"
FROM "User" u WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'seed_td_meal_live_1', 'seed_td_plan_live', 'Breakfast', NULL, 1
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" WHERE "id" = 'seed_td_plan_live')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT * FROM (VALUES
  ('seed_td_food_live_1_1', 'seed_td_meal_live_1', 'Rolled oats', '1 cup dry (80 g)', 300, 10, 54, 6, 1),
  ('seed_td_food_live_1_2', 'seed_td_meal_live_1', 'Avocado', '1 whole medium', 240, 3, 13, 22, 2),
  ('seed_td_food_live_1_3', 'seed_td_meal_live_1', 'Skotidakis yogurt', '⅔ cup (170 g)', 200, 16, 7, 12, 3),
  ('seed_td_food_live_1_4', 'seed_td_meal_live_1', 'Hemp hearts', '20 g', 120, 7, 2, 10, 4),
  ('seed_td_food_live_1_5', 'seed_td_meal_live_1', 'Walnuts', '15 g', 100, 2, 2, 10, 5),
  ('seed_td_food_live_1_6', 'seed_td_meal_live_1', 'Chia seeds', '20 g', 98, 3, 8, 7, 6),
  ('seed_td_food_live_1_7', 'seed_td_meal_live_1', 'Blueberries', '100 g', 57, 1, 14, 0, 7),
  ('seed_td_food_live_1_8', 'seed_td_meal_live_1', 'Broccoli, steamed', '150 g', 51, 5, 10, 0, 8),
  ('seed_td_food_live_1_9', 'seed_td_meal_live_1', 'Kiwi, skin on', '1 medium', 42, 1, 10, 0, 9),
  ('seed_td_food_live_1_10', 'seed_td_meal_live_1', 'Fish oil', '2 caps', 18, 0, 0, 2, 10),
  ('seed_td_food_live_1_11', 'seed_td_meal_live_1', 'Lion''s mane', '2 g', 8, 0, 2, 0, 11),
  ('seed_td_food_live_1_12', 'seed_td_meal_live_1', 'Lemon water', '½ lemon', 8, 0, 3, 0, 12),
  ('seed_td_food_live_1_13', 'seed_td_meal_live_1', 'Matcha', '1 serving', 3, 0, 1, 0, 13),
  ('seed_td_food_live_1_14', 'seed_td_meal_live_1', 'Creatine, D3 + K2', '5 g creatine', 0, 0, 0, 0, 14)
) AS v("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
WHERE EXISTS (SELECT 1 FROM "Meal" WHERE "id" = 'seed_td_meal_live_1')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'seed_td_meal_live_2', 'seed_td_plan_live', 'Pre-workout', NULL, 2
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" WHERE "id" = 'seed_td_plan_live')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT * FROM (VALUES
  ('seed_td_food_live_2_1', 'seed_td_meal_live_2', 'Gold Standard whey', '1 scoop', 120, 24, 3, 2, 1),
  ('seed_td_food_live_2_2', 'seed_td_meal_live_2', 'Blueberries', '100 g', 57, 1, 14, 0, 2)
) AS v("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
WHERE EXISTS (SELECT 1 FROM "Meal" WHERE "id" = 'seed_td_meal_live_2')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Meal" ("id", "planId", "name", "notes", "order")
SELECT 'seed_td_meal_live_3', 'seed_td_plan_live', 'Burrito ×2', NULL, 3
WHERE EXISTS (SELECT 1 FROM "NutritionPlan" WHERE "id" = 'seed_td_plan_live')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
SELECT * FROM (VALUES
  ('seed_td_food_live_3_1', 'seed_td_meal_live_3', 'Chicken breast, cooked', '2 × 150 g (300 g)', 496, 93, 0, 11, 1),
  ('seed_td_food_live_3_2', 'seed_td_meal_live_3', 'Jasmine rice, cooked', '2 × 168 g (336 g)', 404, 8, 88, 1, 2),
  ('seed_td_food_live_3_3', 'seed_td_meal_live_3', 'Black beans', '2 × 120 g (240 g)', 200, 13, 36, 1, 3),
  ('seed_td_food_live_3_4', 'seed_td_meal_live_3', 'Real Good tortilla', '2 × 1 tortilla', 180, 16, 10, 8, 4)
) AS v("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order")
WHERE EXISTS (SELECT 1 FROM "Meal" WHERE "id" = 'seed_td_meal_live_3')
ON CONFLICT ("id") DO NOTHING;
