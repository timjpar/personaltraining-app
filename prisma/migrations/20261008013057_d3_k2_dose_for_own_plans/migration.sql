-- Data migration: the vitamin D and K a coach's daily "Creatine, D3 + K2" row
-- actually carries, so their plans stop reading as 2% vitamin D.
--
-- The supplement is Sports Research Plant-Based D3 + K2, one softgel a day:
-- 125 µg (5,000 IU) vitamin D3 as cholecalciferol and 100 µg vitamin K2 as
-- MK-7. Creatine itself carries none of the tracked nutrients, so those two
-- are the row's whole micronutrient content.
--
-- Same safety rules as 20261008010805_iodine_fats_and_salt_for_own_plans:
-- owner by email, only the coach's own plans (library, or assigned to
-- themselves) and their own logs, matched on name AND exact amount as read off
-- chalkline.click on 2026-10-08, and only keys the row doesn't already have.

UPDATE "Food" f
SET "nutrients" = '{"vitaminD":125,"vitaminK":100}'::jsonb || COALESCE(f."nutrients", '{}'::jsonb)
FROM "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = 'Creatine, D3 + K2'
  AND f."quantity" = '5 g creatine'
  AND NOT (COALESCE(f."nutrients", '{}'::jsonb) ? 'vitaminD');

UPDATE "LoggedFood" lf
SET "nutrients" = '{"vitaminD":125,"vitaminK":100}'::jsonb || COALESCE(lf."nutrients", '{}'::jsonb)
FROM "NutritionLog" l, "User" u
WHERE lf."logId" = l."id"
  AND l."clientId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND lf."name" = 'Creatine, D3 + K2'
  AND lf."quantity" = '5 g creatine'
  AND NOT (COALESCE(lf."nutrients", '{}'::jsonb) ? 'vitaminD');
