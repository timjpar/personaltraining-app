-- Data migration: weights and micronutrients for the foods in one coach's own
-- meal plans (training day, rest day) and in the days they've logged, so the
-- micronutrient panel has something to show the moment it ships.
--
-- A migration because production credentials are not reachable from a
-- developer machine, and `build` runs `prisma migrate deploy` — the same reason
-- and the same safety rules as 20260921120000_add_rest_day_nutrition_plan:
--
--   - The owner is found by email, so on any other database — a fresh dev
--     database, a preview — every UPDATE matches nothing and the deploy is
--     unaffected.
--   - Foods are matched by name AND exact quantity. A row edited to another
--     amount since is not the food these numbers describe, and is left alone.
--   - Only rows with nothing stored are touched (grams and nutrients both
--     null), so a re-deploy is a no-op and nothing typed in the app is ever
--     overwritten.
--   - Only the coach's own plans (library, or assigned to themselves) — never
--     a plan handed to a client.
--
-- Catalog foods (Carrot aside, listed here only so its row is stored rather
-- than derived) need no entry: src/lib/food-presets.ts fills them in at read
-- time. Values are totals for each row's amount: USDA SR Legacy scaled by
-- weight, or the product label where one was found. Matcha and
-- "Creatine, D3 + K2" are deliberately absent — no source for the first, and
-- the D3 dose isn't known for the second.

CREATE TEMP TABLE food_backfill (
  "name"        TEXT,
  "quantity"    TEXT,
  "grams"       DOUBLE PRECISION,
  "gramsPerCup" DOUBLE PRECISION,
  "nutrients"   JSONB
);

INSERT INTO food_backfill ("name", "quantity", "grams", "gramsPerCup", "nutrients") VALUES
  -- USDA 173904 oats, dry
  ('Rolled oats', '1 cup dry (80 g)', 80, 80, '{"fiber":8.08,"sugar":0.79,"satFat":0.89,"monoFat":1.58,"polyFat":1.84,"cholesterol":0,"sodium":4.8,"potassium":289.6,"calcium":41.6,"iron":3.4,"magnesium":110.4,"zinc":2.91,"phosphorus":328,"copper":0.31,"manganese":2.9,"selenium":23.12,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":0.34,"vitaminK":1.6,"thiamin":0.37,"riboflavin":0.12,"niacin":0.9,"pantothenicAcid":0.9,"vitaminB6":0.08,"folate":25.6,"vitaminB12":0,"choline":32.32}'::jsonb),
  -- USDA 171706 Hass avocado, 150 g
  ('Avocado', '1 whole medium', 150, 150, '{"fiber":10.2,"sugar":0.45,"satFat":3.19,"monoFat":14.7,"polyFat":2.72,"cholesterol":0,"sodium":12,"potassium":760.5,"calcium":19.5,"iron":0.92,"magnesium":43.5,"zinc":1.02,"phosphorus":81,"copper":0.26,"manganese":0.22,"selenium":0.6,"vitaminA":10.5,"vitaminC":13.2,"vitaminD":0,"vitaminE":2.96,"vitaminK":31.5,"thiamin":0.11,"riboflavin":0.21,"niacin":2.87,"pantothenicAcid":2.19,"vitaminB6":0.43,"folate":133.5,"vitaminB12":0,"choline":21.3}'::jsonb),
  -- USDA 171304 whole-milk Greek yogurt (no Skotidakis label to hand)
  ('Skotidakis yogurt', '⅔ cup (170 g)', 170, 255, '{"fiber":0,"sugar":6.8,"satFat":4.07,"monoFat":3.63,"polyFat":0.8,"cholesterol":22.1,"sodium":59.5,"potassium":239.7,"calcium":170,"iron":0,"magnesium":18.7,"zinc":0.88,"phosphorus":229.5,"copper":0.03,"manganese":0.02,"selenium":16.49,"vitaminA":3.4,"vitaminC":0,"vitaminD":0,"vitaminE":0.02,"vitaminK":0,"thiamin":0.04,"riboflavin":0.47,"niacin":0.35,"pantothenicAcid":0.56,"vitaminB6":0.11,"folate":8.5,"vitaminB12":1.27,"choline":25.67}'::jsonb),
  -- USDA 170148 hulled hemp seed
  ('Hemp hearts', '20 g', 20, 160, '{"fiber":0.8,"sugar":0.3,"satFat":0.92,"monoFat":1.08,"polyFat":7.62,"cholesterol":0,"sodium":1,"potassium":240,"calcium":14,"iron":1.59,"magnesium":140,"zinc":1.98,"phosphorus":330,"copper":0.32,"manganese":1.52,"vitaminA":0.2,"vitaminC":0.1,"vitaminE":0.16,"thiamin":0.26,"riboflavin":0.06,"niacin":1.84,"vitaminB6":0.12,"folate":22}'::jsonb),
  -- USDA 170187
  ('Walnuts', '15 g', 15, 117, '{"fiber":1,"sugar":0.39,"satFat":0.92,"monoFat":1.34,"polyFat":7.08,"cholesterol":0,"sodium":0.3,"potassium":66.15,"calcium":14.7,"iron":0.44,"magnesium":23.7,"zinc":0.46,"phosphorus":51.9,"copper":0.24,"manganese":0.51,"selenium":0.74,"vitaminA":0.15,"vitaminC":0.2,"vitaminD":0,"vitaminE":0.11,"vitaminK":0.41,"thiamin":0.05,"riboflavin":0.02,"niacin":0.17,"pantothenicAcid":0.09,"vitaminB6":0.08,"folate":14.7,"vitaminB12":0,"choline":5.88}'::jsonb),
  -- USDA 170562
  ('Sunflower seeds', '20 g', 20, 140, '{"fiber":1.72,"sugar":0.52,"satFat":0.89,"monoFat":3.71,"polyFat":4.63,"cholesterol":0,"sodium":1.8,"potassium":129,"calcium":15.6,"iron":1.05,"magnesium":65,"zinc":1,"phosphorus":132,"copper":0.36,"manganese":0.39,"selenium":10.6,"vitaminA":0.6,"vitaminC":0.28,"vitaminD":0,"vitaminE":7.03,"vitaminK":0,"thiamin":0.3,"riboflavin":0.07,"niacin":1.67,"pantothenicAcid":0.23,"vitaminB6":0.27,"folate":45.4,"vitaminB12":0,"choline":11.02}'::jsonb),
  -- USDA 170554
  ('Chia seeds', '20 g', 20, 192, '{"fiber":6.88,"satFat":0.67,"monoFat":0.46,"polyFat":4.73,"cholesterol":0,"sodium":3.2,"potassium":81.4,"calcium":126.2,"iron":1.54,"magnesium":67,"zinc":0.92,"phosphorus":172,"copper":0.18,"manganese":0.54,"selenium":11.04,"vitaminC":0.32,"vitaminE":0.1,"thiamin":0.12,"riboflavin":0.03,"niacin":1.77,"vitaminB12":0}'::jsonb),
  -- USDA 171711
  ('Blueberries', '100 g', 100, 148, '{"fiber":2.4,"sugar":9.96,"satFat":0.03,"monoFat":0.05,"polyFat":0.15,"cholesterol":0,"sodium":1,"potassium":77,"calcium":6,"iron":0.28,"magnesium":6,"zinc":0.16,"phosphorus":12,"copper":0.06,"manganese":0.34,"selenium":0.1,"vitaminA":3,"vitaminC":9.7,"vitaminD":0,"vitaminE":0.57,"vitaminK":19.3,"thiamin":0.04,"riboflavin":0.04,"niacin":0.42,"pantothenicAcid":0.12,"vitaminB6":0.05,"folate":6,"vitaminB12":0,"choline":6}'::jsonb),
  -- USDA 169967 broccoli, boiled
  ('Broccoli, steamed', '150 g', 150, 156, '{"fiber":4.95,"sugar":2.08,"satFat":0.12,"monoFat":0.06,"polyFat":0.26,"cholesterol":0,"sodium":61.5,"potassium":439.5,"calcium":60,"iron":1,"magnesium":31.5,"zinc":0.68,"phosphorus":100.5,"copper":0.09,"manganese":0.29,"selenium":2.4,"vitaminA":115.5,"vitaminC":97.35,"vitaminD":0,"vitaminE":2.17,"vitaminK":211.65,"thiamin":0.09,"riboflavin":0.18,"niacin":0.83,"pantothenicAcid":0.92,"vitaminB6":0.3,"folate":162,"vitaminB12":0,"choline":60.15}'::jsonb),
  -- USDA 168153 green kiwifruit, 69 g
  ('Kiwi, skin on', '1 medium', 69, 180, '{"fiber":2.07,"sugar":6.2,"satFat":0.02,"monoFat":0.03,"polyFat":0.2,"cholesterol":0,"sodium":2.07,"potassium":215.28,"calcium":23.46,"iron":0.21,"magnesium":11.73,"zinc":0.1,"phosphorus":23.46,"copper":0.09,"manganese":0.07,"selenium":0.14,"vitaminA":2.76,"vitaminC":63.96,"vitaminD":0,"vitaminE":1.01,"vitaminK":27.81,"thiamin":0.02,"riboflavin":0.02,"niacin":0.24,"pantothenicAcid":0.13,"vitaminB6":0.04,"folate":17.25,"vitaminB12":0,"choline":5.38}'::jsonb),
  -- USDA 172343 salmon oil, 2 x 1 g
  ('Fish oil', '2 caps', 2, NULL, '{"fiber":0,"satFat":0.4,"monoFat":0.58,"polyFat":0.81,"cholesterol":9.7,"sodium":0,"potassium":0,"calcium":0,"iron":0,"magnesium":0,"zinc":0,"phosphorus":0,"copper":0,"manganese":0,"selenium":0,"vitaminA":0,"vitaminC":0,"thiamin":0,"riboflavin":0,"niacin":0,"pantothenicAcid":0,"vitaminB6":0,"folate":0,"vitaminB12":0}'::jsonb),
  -- weight only
  ('Lion''s mane', '2 g', 2, NULL, NULL),
  -- USDA 167747 lemon juice, 24 g (half a lemon's yield)
  ('Lemon water', '½ lemon', NULL, NULL, '{"fiber":0.07,"sugar":0.6,"satFat":0.01,"monoFat":0,"polyFat":0.01,"cholesterol":0,"sodium":0.24,"potassium":24.72,"calcium":1.44,"iron":0.02,"magnesium":1.44,"zinc":0.01,"phosphorus":1.92,"copper":0,"manganese":0,"selenium":0.02,"vitaminA":0,"vitaminC":9.29,"vitaminD":0,"vitaminE":0.04,"vitaminK":0,"thiamin":0.01,"riboflavin":0,"niacin":0.02,"pantothenicAcid":0.03,"vitaminB6":0.01,"folate":4.8,"vitaminB12":0,"choline":1.22}'::jsonb),
  -- label (Open Food Facts 0748927028669)
  ('Gold Standard whey', '1 scoop', 30.4, NULL, '{"satFat":1,"cholesterol":54.1,"sodium":130,"potassium":197,"calcium":130,"iron":0.69,"phosphorus":206,"sugar":1,"fiber":0}'::jsonb),
  -- USDA 171477
  ('Chicken breast, cooked', '2 × 150 g (300 g)', 300, 140, '{"fiber":0,"sugar":0,"satFat":3.03,"monoFat":3.72,"polyFat":2.31,"cholesterol":255,"sodium":222,"potassium":768,"calcium":45,"iron":3.12,"magnesium":87,"zinc":3,"phosphorus":684,"copper":0.15,"manganese":0.05,"selenium":82.8,"vitaminA":18,"vitaminC":0,"vitaminD":0.3,"vitaminE":0.81,"vitaminK":0.9,"thiamin":0.21,"riboflavin":0.34,"niacin":41.14,"pantothenicAcid":2.9,"vitaminB6":1.8,"folate":12,"vitaminB12":1.02,"choline":255.9}'::jsonb),
  -- USDA 169757 unenriched white rice, cooked
  ('Jasmine rice, cooked', '2 × 168 g (336 g)', 336, 158, '{"fiber":1.34,"sugar":0.17,"satFat":0.26,"monoFat":0.3,"polyFat":0.26,"cholesterol":0,"sodium":3.36,"potassium":117.6,"calcium":33.6,"iron":0.67,"magnesium":40.32,"zinc":1.65,"phosphorus":144.48,"copper":0.23,"manganese":1.59,"selenium":25.2,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":0.13,"vitaminK":0,"thiamin":0.07,"riboflavin":0.04,"niacin":1.34,"pantothenicAcid":1.31,"vitaminB6":0.31,"folate":10.08,"vitaminB12":0,"choline":7.06}'::jsonb),
  -- USDA 169757 unenriched white rice, cooked
  ('Jasmine rice, cooked', '2 × 84 g (168 g)', 168, 158, '{"fiber":0.67,"sugar":0.08,"satFat":0.13,"monoFat":0.15,"polyFat":0.13,"cholesterol":0,"sodium":1.68,"potassium":58.8,"calcium":16.8,"iron":0.34,"magnesium":20.16,"zinc":0.82,"phosphorus":72.24,"copper":0.12,"manganese":0.79,"selenium":12.6,"vitaminA":0,"vitaminC":0,"vitaminD":0,"vitaminE":0.07,"vitaminK":0,"thiamin":0.03,"riboflavin":0.02,"niacin":0.67,"pantothenicAcid":0.66,"vitaminB6":0.16,"folate":5.04,"vitaminB12":0,"choline":3.53}'::jsonb),
  -- USDA 175188 black beans, canned
  ('Black beans', '2 × 120 g (240 g)', 240, 240, '{"fiber":16.56,"sugar":0.55,"satFat":0.18,"monoFat":0.06,"polyFat":0.3,"cholesterol":0,"sodium":921.6,"potassium":739.2,"calcium":84,"iron":4.56,"magnesium":84,"zinc":1.3,"phosphorus":259.2,"copper":0.46,"manganese":0.56,"selenium":3.12,"vitaminA":0,"vitaminC":6.48,"vitaminD":0,"vitaminE":1.49,"vitaminK":5.52,"thiamin":0.34,"riboflavin":0.29,"niacin":1.49,"pantothenicAcid":0.44,"vitaminB6":0.13,"folate":146.4,"vitaminB12":0,"choline":55.68}'::jsonb),
  -- label x2 (Open Food Facts 0850074614296, 56 g burrito-style)
  ('Real Good tortilla', '2 × 1 tortilla', 112, NULL, '{"fiber":26,"sugar":0,"satFat":4,"cholesterol":10,"sodium":780,"potassium":40,"calcium":200,"iron":1.4,"vitaminD":0}'::jsonb),
  -- USDA 168195
  ('Clementine', '1 medium (74 g)', 74, NULL, '{"fiber":1.26,"sugar":6.79,"sodium":0.74,"potassium":130.98,"calcium":22.2,"iron":0.1,"magnesium":7.4,"zinc":0.04,"phosphorus":15.54,"copper":0.03,"manganese":0.02,"selenium":0.07,"vitaminC":36.11,"vitaminD":0,"vitaminE":0.15,"vitaminK":0,"thiamin":0.06,"riboflavin":0.02,"niacin":0.47,"pantothenicAcid":0.11,"vitaminB6":0.06,"folate":17.76,"choline":10.36}'::jsonb),
  -- USDA 170393
  ('Carrot', '1 medium (61 g)', 61, 128, '{"fiber":1.71,"sugar":2.89,"satFat":0.02,"monoFat":0.01,"polyFat":0.06,"cholesterol":0,"sodium":42.09,"potassium":195.2,"calcium":20.13,"iron":0.18,"magnesium":7.32,"zinc":0.15,"phosphorus":21.35,"copper":0.03,"manganese":0.09,"selenium":0.06,"vitaminA":509.35,"vitaminC":3.6,"vitaminD":0,"vitaminE":0.4,"vitaminK":8.05,"thiamin":0.04,"riboflavin":0.04,"niacin":0.6,"pantothenicAcid":0.17,"vitaminB6":0.08,"folate":11.59,"vitaminB12":0,"choline":5.37}'::jsonb)
;

UPDATE "Food" f
SET "grams" = b."grams", "gramsPerCup" = b."gramsPerCup", "nutrients" = b."nutrients"
FROM food_backfill b, "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = b."name"
  AND f."quantity" = b."quantity"
  AND f."grams" IS NULL
  AND f."nutrients" IS NULL;

UPDATE "LoggedFood" lf
SET "grams" = b."grams", "gramsPerCup" = b."gramsPerCup", "nutrients" = b."nutrients"
FROM food_backfill b, "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = b."name"
  AND lf."quantity" = b."quantity"
  AND lf."grams" IS NULL
  AND lf."nutrients" IS NULL;

DROP TABLE food_backfill;
