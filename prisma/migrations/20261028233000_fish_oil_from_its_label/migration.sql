-- Data migration: the fish oil in one coach's own plans and log, from the
-- label on the bottle they take instead of a generic USDA salmon oil.
--
-- Nordic Naturals, 2 soft gels: 20 kcal, 2 g fat, 1,280 mg omega-3s of which
-- 650 mg EPA and 450 mg DHA, cholesterol under 5 mg. The salmon oil stand-in
-- (USDA 172343, 2 g) had 18 kcal, 0.26 g EPA, 0.36 g DHA and 9.7 mg
-- cholesterol: a third the omega-3 and twice the label's cholesterol ceiling.
--
--   - EPA and DHA are the label's. Polyunsaturated fat is the 1.28 g of
--     omega-3s: all of them are polyunsaturated, so it is at least that; the
--     label names no other fat.
--   - Saturated and monounsaturated fat, ALA and omega-6 come off. They were
--     salmon oil's split of 2 g of oil, and this is a concentrate at 64%
--     omega-3, so that split doesn't describe it; the label gives none, and
--     unknown is not zero.
--   - Cholesterol comes off too: "less than 5 mg" says it's under 5, not what
--     it is.
--   - Everything else stored stays: the zeros for minerals and vitamins hold
--     for any fish oil, and the weight is the label's 2 g of fat.
--
-- The ticked-off copies in the coach's log get the same, so a day already
-- logged reads like the plan it came from.
--
-- Same safety rules as the plan migrations before it: the owner is found by
-- email, only the coach's own plans (library, or assigned to themselves) and
-- their own log are touched, and rows are matched on name and exact amount.

UPDATE "Food" f
SET
  "calories" = 20,
  "protein" = 0,
  "carbs" = 0,
  "fat" = 2,
  "nutrients" = (
    COALESCE(f."nutrients", '{}'::jsonb)
      - 'satFat' - 'monoFat' - 'omega3Ala' - 'omega6La' - 'cholesterol'
  ) || '{"polyFat":1.28,"omega3Epa":0.65,"omega3Dha":0.45}'::jsonb
FROM "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = 'Fish oil'
  AND f."quantity" = '2 caps';

UPDATE "LoggedFood" lf
SET
  "calories" = 20,
  "protein" = 0,
  "carbs" = 0,
  "fat" = 2,
  "nutrients" = (
    COALESCE(lf."nutrients", '{}'::jsonb)
      - 'satFat' - 'monoFat' - 'omega3Ala' - 'omega6La' - 'cholesterol'
  ) || '{"polyFat":1.28,"omega3Epa":0.65,"omega3Dha":0.45}'::jsonb
FROM "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Fish oil'
  AND lf."quantity" = '2 caps';
