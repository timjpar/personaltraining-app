-- Data migration: the avocado one coach actually eats is a Good Foods organic
-- avocado mash (sea salt & black pepper), not the Wholly "nothing added" mini
-- that 20261007224958_wholly_avocado_and_olive_oil_daily put in every one of
-- their own plans. Their plans and their past log days both carried the Wholly
-- numbers, so both are swapped.
--
-- Same reasoning and safety rules as 20260923233400_backfill_training_day_nutrients:
-- the owner is found by email, so any other database matches nothing; only the
-- coach's own plans (library, or assigned to themselves) and their own log are
-- touched, never a plan handed to a client. A row is swapped only while it is
-- still exactly the Wholly mini as that migration wrote it — name, amount, 130
-- kcal and 11 g fat — so a row edited by hand since is left alone.
--
--   1. Each plan row becomes one Good Foods container, updated in place so it
--      keeps its spot and its group.
--   2. Each plan's calorie and fat targets, and the kcal in its title, move by
--      exactly what the swap changed (-40 kcal and -3 g fat a row). Protein and
--      carbs are the same on both labels.
--   3. Logged rows get the same numbers, so a past day reads what was eaten,
--      and so its tick still lines up with the plan, which matches on name.
--
-- The numbers are the Good Foods label (one 56 g container: 90 kcal, 1 g
-- protein, 5 g carbs, 8 g fat; fibre 4 g, sugars 0 g, added sugars 0 g,
-- saturated fat 1 g, trans fat 0 g, cholesterol 0 mg, sodium 220 mg, potassium
-- 260 mg, calcium 10 mg, iron 0.3 mg, vitamin D 0 µg). The ingredients are Hass
-- avocado, lemon juice, sea salt and black pepper, so every nutrient the label
-- doesn't print is USDA 171706 (Hass avocado) scaled to 56 g, from the app's
-- own catalog table. Chloride is the one exception: avocado has next to none,
-- and it comes from the salt, so it is the label's sodium less the avocado's
-- 4.5 mg, times chloride's share of NaCl (35.45 / 22.99). gramsPerCup stays
-- USDA's 230 g for a cup of puréed avocado.
--
-- Every step is guarded by the state it produces, so a re-deploy is a no-op.

CREATE TEMP TABLE own_plans AS
SELECT p."id"
FROM "NutritionPlan" p
JOIN "User" u ON u."id" = p."trainerId"
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId");

-- Counted before the swap, which is what step 2 needs and what the swap
-- itself destroys.
CREATE TEMP TABLE swapped AS
SELECT m."planId", count(*)::int AS n
FROM "Food" f
JOIN "Meal" m ON m."id" = f."mealId"
WHERE m."planId" IN (SELECT "id" FROM own_plans)
  AND f."name" = 'Wholly smashed avocado (nothing added)'
  AND f."quantity" = '1 mini (57 g)'
  AND f."calories" = 130
  AND f."fat" = 11
GROUP BY m."planId";

UPDATE "Food" f
SET
  "name" = 'Good Foods avocado mash (sea salt & pepper)',
  "quantity" = '1 container (56 g)',
  "calories" = 90, "protein" = 1, "carbs" = 5, "fat" = 8,
  "grams" = 56,
  "gramsPerCup" = 230,
  "nutrients" = '{"fiber":4,"sugar":0,"addedSugar":0,"satFat":1,"transFat":0,"monoFat":5.49,"polyFat":1.02,"omega3Ala":0.06,"omega3Epa":0,"omega3Dha":0,"omega6La":0.94,"cholesterol":0,"sodium":220,"potassium":260,"calcium":10,"iron":0.3,"magnesium":16.24,"zinc":0.38,"iodine":0.11,"phosphorus":30.24,"copper":0.1,"manganese":0.08,"selenium":0.22,"chromium":0,"molybdenum":1.08,"chloride":332,"vitaminA":3.92,"vitaminC":4.93,"vitaminD":0,"vitaminE":1.1,"vitaminK":11.76,"thiamin":0.04,"riboflavin":0.08,"niacin":1.07,"pantothenicAcid":0.82,"vitaminB6":0.16,"biotin":2.86,"folate":49.84,"vitaminB12":0,"choline":7.95}'::jsonb
FROM "Meal" m
WHERE f."mealId" = m."id"
  AND m."planId" IN (SELECT "planId" FROM swapped)
  AND f."name" = 'Wholly smashed avocado (nothing added)'
  AND f."quantity" = '1 mini (57 g)'
  AND f."calories" = 130
  AND f."fat" = 11;

UPDATE "NutritionPlan" p
SET
  "targetCalories" = p."targetCalories" - 40 * s.n,
  "targetFat"      = p."targetFat" - 3 * s.n,
  "title" = CASE
    WHEN p."targetCalories" IS NULL THEN p."title"
    ELSE regexp_replace(p."title", '[0-9][0-9,]* kcal', to_char(p."targetCalories" - 40 * s.n, 'FM999,999') || ' kcal')
  END,
  "updatedAt" = NOW()
FROM swapped s
WHERE s."planId" = p."id";

UPDATE "LoggedFood" lf
SET
  "name" = 'Good Foods avocado mash (sea salt & pepper)',
  "quantity" = '1 container (56 g)',
  "calories" = 90, "protein" = 1, "carbs" = 5, "fat" = 8,
  "grams" = 56,
  "gramsPerCup" = 230,
  "nutrients" = '{"fiber":4,"sugar":0,"addedSugar":0,"satFat":1,"transFat":0,"monoFat":5.49,"polyFat":1.02,"omega3Ala":0.06,"omega3Epa":0,"omega3Dha":0,"omega6La":0.94,"cholesterol":0,"sodium":220,"potassium":260,"calcium":10,"iron":0.3,"magnesium":16.24,"zinc":0.38,"iodine":0.11,"phosphorus":30.24,"copper":0.1,"manganese":0.08,"selenium":0.22,"chromium":0,"molybdenum":1.08,"chloride":332,"vitaminA":3.92,"vitaminC":4.93,"vitaminD":0,"vitaminE":1.1,"vitaminK":11.76,"thiamin":0.04,"riboflavin":0.08,"niacin":1.07,"pantothenicAcid":0.82,"vitaminB6":0.16,"biotin":2.86,"folate":49.84,"vitaminB12":0,"choline":7.95}'::jsonb
FROM "NutritionLog" l
JOIN "User" u ON u."id" = l."clientId"
WHERE lf."logId" = l."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Wholly smashed avocado (nothing added)'
  AND lf."quantity" = '1 mini (57 g)'
  AND lf."calories" = 130
  AND lf."fat" = 11;

DROP TABLE swapped;
DROP TABLE own_plans;
