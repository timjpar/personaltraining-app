-- Data migration: the nutrients this release starts tracking (iodine, added
-- sugar, trans fat, omega-3 ALA/EPA/DHA, omega-6 LA) for the foods in one
-- coach's own meal plans and logged days, plus ¼ tsp of iodized salt in each of
-- those plans, so the iodine panel reads true the day it ships.
--
-- Same safety rules as 20260923233400_backfill_training_day_nutrients: owner by
-- email, only the coach's own plans (library, or assigned to themselves) and
-- their own logs, foods matched on name AND exact amount as read off
-- chalkline.click on 2026-10-08. Nothing stored is ever overwritten — each patch
-- only adds keys a row doesn't have — so a re-deploy is a no-op.
--
-- Fats are USDA SR Legacy (the fdc_ids the 2026-09-23 backfill named), scaled
-- to each row's weight. Iodine is the USDA, FDA and ODS-NIH iodine database,
-- Release 4, where it lists the food; foods it doesn't list are left unknown,
-- not zero. Added sugar is 0 for single-ingredient foods by definition and the
-- label figure for packaged ones (7 g in the oat milk). Catalog foods (Olive
-- Oil, Banana, Sunflower Seeds) get exactly what src/lib/food-presets.ts
-- derives for them. The salt row is the new "Iodized Salt" catalog entry at one
-- serving: 582 mg sodium, 78 µg iodine, 897 mg chloride.

CREATE TEMP TABLE nutrient_patch ("name" TEXT, "quantity" TEXT, "patch" JSONB);
INSERT INTO nutrient_patch VALUES
  ('Rolled oats', '¾ cup dry (60 g)', '{"omega3Ala":0.06,"omega3Epa":0,"omega3Dha":0,"omega6La":1.32,"addedSugar":0}'::jsonb),
  ('Wholly smashed avocado (nothing added)', '1 mini (57 g)', '{"transFat":0,"omega3Ala":0.06,"omega3Epa":0,"omega3Dha":0,"omega6La":0.95,"iodine":0.11,"addedSugar":0}'::jsonb),
  ('Skotidakis yogurt', '⅔ cup (170 g)', '{"transFat":0,"omega3Ala":0.04,"omega3Epa":0,"omega3Dha":0.01,"omega6La":0.36,"iodine":71.91,"addedSugar":0}'::jsonb),
  ('Hemp hearts', '20 g', '{"transFat":0,"omega3Ala":1.74,"omega6La":5.47,"addedSugar":0}'::jsonb),
  ('Sunflower Seeds', '28 g', '{"omega3Ala":0.02,"omega3Epa":0,"omega3Dha":0,"omega6La":6.47,"iodine":0.03,"addedSugar":0}'::jsonb),
  ('Chia seeds', '10 g', '{"transFat":0.01,"omega3Ala":1.78,"omega6La":0.58,"addedSugar":0}'::jsonb),
  ('Blueberries', '100 g', '{"transFat":0,"omega3Ala":0.06,"omega3Epa":0,"omega3Dha":0,"omega6La":0.09,"iodine":0.3,"addedSugar":0}'::jsonb),
  ('Broccoli, steamed', '150 g', '{"transFat":0,"omega3Ala":0.18,"omega3Epa":0,"omega3Dha":0,"omega6La":0.08,"iodine":0.75,"addedSugar":0}'::jsonb),
  ('Kiwi, skin on', '1 medium', '{"transFat":0,"omega3Ala":0.03,"omega3Epa":0,"omega3Dha":0,"omega6La":0.17,"addedSugar":0}'::jsonb),
  ('Fish oil', '2 caps', '{"omega3Ala":0.02,"omega3Epa":0.26,"omega3Dha":0.36,"omega6La":0.03,"addedSugar":0}'::jsonb),
  ('Lemon water', '½ lemon', '{"transFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0,"iodine":0.36,"addedSugar":0}'::jsonb),
  ('Kirkland organic oat milk', '1 cup (240 ml)', '{"addedSugar":7,"transFat":0}'::jsonb),
  ('Olive Oil', '1 tbsp (14 g)', '{"omega3Ala":0.11,"omega3Epa":0,"omega3Dha":0,"omega6La":1.37,"iodine":0.03,"addedSugar":0}'::jsonb),
  ('Banana', '1 medium (118 g)', '{"transFat":0,"omega3Ala":0.03,"omega3Epa":0,"omega3Dha":0,"omega6La":0.05,"iodine":0.24,"addedSugar":0}'::jsonb),
  ('Clementine', '1 medium (74 g)', '{"transFat":0,"addedSugar":0}'::jsonb),
  ('Gold Standard whey', '1 scoop', '{"iodine":29.7}'::jsonb),
  ('Chicken breast, cooked', '2 × 150 g (300 g)', '{"omega3Ala":0.09,"omega3Epa":0.03,"omega3Dha":0.06,"omega6La":1.77,"iodine":3.6,"addedSugar":0}'::jsonb),
  ('Jasmine rice, cooked', '2 × 126 g (252 g)', '{"omega3Ala":0.03,"omega3Epa":0,"omega3Dha":0,"omega6La":0.16,"iodine":0.5,"addedSugar":0}'::jsonb),
  ('Jasmine rice, cooked', '2 × 42 g (84 g)', '{"omega3Ala":0.01,"omega3Epa":0,"omega3Dha":0,"omega6La":0.05,"iodine":0.17,"addedSugar":0}'::jsonb),
  ('Black beans, rinsed', '2 × 120 g (240 g)', '{"transFat":0,"omega3Ala":0.14,"omega3Epa":0,"omega3Dha":0,"omega6La":0.16,"iodine":0,"addedSugar":0}'::jsonb),
  ('Real Good tortilla', '2 × 1 tortilla', '{"addedSugar":0}'::jsonb),
  ('Carrot', '1 medium (61 g)', '{"transFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0.06,"iodine":0.37,"addedSugar":0}'::jsonb);

UPDATE "Food" f
SET "nutrients" = np."patch" || COALESCE(f."nutrients", '{}'::jsonb)
FROM nutrient_patch np, "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = np."name"
  AND f."quantity" = np."quantity"
  AND NOT (COALESCE(f."nutrients", '{}'::jsonb) @> np."patch");

UPDATE "LoggedFood" lf
SET "nutrients" = np."patch" || COALESCE(lf."nutrients", '{}'::jsonb)
FROM nutrient_patch np, "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = np."name"
  AND lf."quantity" = np."quantity"
  AND NOT (COALESCE(lf."nutrients", '{}'::jsonb) @> np."patch");

-- The salt goes with the burritos, the day's savoury meal; a plan without one
-- gets it in its last meal.
INSERT INTO "Food" ("id", "mealId", "name", "quantity", "calories", "protein", "carbs", "fat", "order", "grams", "gramsPerCup", "nutrients")
SELECT
  'food_salt_' || t."mealId",
  t."mealId",
  'Iodized Salt',
  '¼ tsp (1.5 g)',
  0, 0, 0, 0,
  COALESCE((SELECT max(f."order") FROM "Food" f WHERE f."mealId" = t."mealId"), 0) + 1,
  1.5,
  288,
  '{"fiber":0,"sugar":0,"satFat":0,"transFat":0,"monoFat":0,"polyFat":0,"omega3Ala":0,"omega3Epa":0,"omega3Dha":0,"omega6La":0,"cholesterol":0,"sodium":582,"potassium":0.12,"calcium":0.36,"iron":0,"magnesium":0.02,"zinc":0,"iodine":78.15,"phosphorus":0,"copper":0,"manganese":0,"selenium":0,"chloride":897,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":0,"vitaminK":0,"thiamin":0,"riboflavin":0,"niacin":0,"pantothenicAcid":0,"vitaminB6":0,"folate":0,"vitaminB12":0,"choline":0}'::jsonb
FROM (
  SELECT DISTINCT ON (m."planId") m."planId", m."id" AS "mealId"
  FROM "Meal" m
  JOIN "NutritionPlan" p ON p."id" = m."planId"
  JOIN "User" u ON u."id" = p."trainerId"
  WHERE lower(u."email") = 'timmyjparsons@gmail.com'
    AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  ORDER BY m."planId", (m."name" = 'Burrito ×2') DESC, m."order" DESC, m."id"
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "Food" f
  JOIN "Meal" m ON m."id" = f."mealId"
  WHERE m."planId" = t."planId" AND lower(f."name") LIKE '%salt%'
)
ON CONFLICT DO NOTHING;

DROP TABLE nutrient_patch;
