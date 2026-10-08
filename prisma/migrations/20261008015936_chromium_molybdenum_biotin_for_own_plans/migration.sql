-- Data migration: chromium, molybdenum and biotin for the foods in one coach's
-- own meal plans and logged days, and the matcha row's micronutrients, which
-- it never had.
--
-- Values are the Standard Tables of Food Composition in Japan (eighth revised
-- edition, 2023 supplement), moisture-adjusted to the USDA entry each food was
-- already matched to — the same rule scripts/build-food-nutrients.ts applies to
-- the catalog. Stand-ins: whole hemp seed for hemp hearts, mandarin for the
-- clementine, kidney beans (the same species) for the black beans. The matcha
-- row is taken as 1 g, matching its 3 kcal: Japan's matcha entry for every
-- nutrient it measures, and sencha leaf for the six it doesn't (manganese,
-- iodine, selenium, chromium, molybdenum, biotin). Catalog foods in these plans
-- need nothing here; they pick the new values up from the catalog at read time.
--
-- Same safety rules as 20261008010805_iodine_fats_and_salt_for_own_plans:
-- owner by email, only the coach's own plans (library, or assigned to
-- themselves) and their own logs, foods matched on name AND exact amount as
-- read off chalkline.click on 2026-10-08, and only keys a row doesn't already
-- have.

CREATE TEMP TABLE nutrient_patch ("name" TEXT, "quantity" TEXT, "patch" JSONB);
INSERT INTO nutrient_patch VALUES
  ('Rolled oats', '¾ cup dry (60 g)', '{"chromium":0,"molybdenum":65.38,"biotin":13.08}'::jsonb),
  ('Wholly smashed avocado (nothing added)', '1 mini (57 g)', '{"chromium":0,"molybdenum":1.1,"biotin":2.91}'::jsonb),
  ('Skotidakis yogurt', '⅔ cup (170 g)', '{"chromium":0,"molybdenum":10.34,"biotin":6.46}'::jsonb),
  ('Hemp hearts', '20 g', '{"chromium":1.79,"molybdenum":8.97,"biotin":5.58}'::jsonb),
  ('Chia seeds', '10 g', '{"chromium":0.81,"molybdenum":4.43,"biotin":2.42}'::jsonb),
  ('Blueberries', '100 g', '{"chromium":0,"molybdenum":1.16,"biotin":1.28}'::jsonb),
  ('Broccoli, steamed', '150 g', '{"chromium":0,"molybdenum":6.39,"biotin":11.34}'::jsonb),
  ('Kiwi, skin on', '1 medium', '{"chromium":0,"molybdenum":0,"biotin":1.07}'::jsonb),
  ('Lemon water', '½ lemon', '{"chromium":0,"molybdenum":0.19,"biotin":0.06}'::jsonb),
  ('Clementine', '1 medium (74 g)', '{"chromium":0,"molybdenum":0,"biotin":0.38}'::jsonb),
  ('Chicken breast, cooked', '2 × 150 g (300 g)', '{"chromium":2.46,"molybdenum":9.83,"biotin":13.03}'::jsonb),
  ('Jasmine rice, cooked', '2 × 126 g (252 g)', '{"chromium":0,"molybdenum":59.65,"biotin":0.99}'::jsonb),
  ('Jasmine rice, cooked', '2 × 42 g (84 g)', '{"chromium":0,"molybdenum":19.88,"biotin":0.33}'::jsonb),
  ('Black beans, rinsed', '2 × 120 g (240 g)', '{"chromium":0,"molybdenum":43.37,"biotin":5.94}'::jsonb),
  ('Matcha', '1 serving', '{"fiber":0.39,"cholesterol":0,"sodium":0.06,"potassium":27,"calcium":4.2,"magnesium":2.3,"phosphorus":3.5,"iron":0.17,"zinc":0.06,"copper":0.01,"manganese":0.54,"iodine":0.04,"selenium":0.03,"chromium":0.08,"molybdenum":0.01,"vitaminA":24,"vitaminD":0,"vitaminE":0.28,"vitaminK":29,"thiamin":0.01,"riboflavin":0.01,"niacin":0.04,"vitaminB6":0.01,"vitaminB12":0,"folate":12,"pantothenicAcid":0.04,"biotin":0.51,"vitaminC":0.6}'::jsonb);

UPDATE "Food" f
SET
  "nutrients" = np."patch" || COALESCE(f."nutrients", '{}'::jsonb),
  "grams" = CASE WHEN f."name" = 'Matcha' THEN COALESCE(f."grams", 1) ELSE f."grams" END
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
SET
  "nutrients" = np."patch" || COALESCE(lf."nutrients", '{}'::jsonb),
  "grams" = CASE WHEN lf."name" = 'Matcha' THEN COALESCE(lf."grams", 1) ELSE lf."grams" END
FROM nutrient_patch np, "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = np."name"
  AND lf."quantity" = np."quantity"
  AND NOT (COALESCE(lf."nutrients", '{}'::jsonb) @> np."patch");

DROP TABLE nutrient_patch;
