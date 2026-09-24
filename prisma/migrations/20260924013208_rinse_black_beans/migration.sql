-- Data migration: marks the black beans in one coach's own rest-day and
-- training-day plans as drained and rinsed, and cuts their stored sodium to
-- match. Draining and rinsing canned beans removes about 41% of the sodium;
-- nothing else on the row moves by enough to matter, so only sodium changes.
--
-- Same safety rules as the plan migrations before it: owner by email, only the
-- coach's own copies, and the rename is the idempotency key — a re-deploy finds
-- no "Black beans" and does nothing. Sodium is scaled from whatever is stored,
-- so a row whose amount was edited in the app still comes out right, and a row
-- with no micronutrients stays that way.

UPDATE "Food" f
SET
  "name" = 'Black beans, rinsed',
  "nutrients" = CASE
    WHEN f."nutrients" ? 'sodium' THEN jsonb_set(
      f."nutrients",
      '{sodium}',
      to_jsonb(round((f."nutrients" ->> 'sodium')::numeric * 0.59, 2))
    )
    ELSE f."nutrients"
  END
FROM "Meal" m, "NutritionPlan" p, "User" u
WHERE f."mealId" = m."id"
  AND m."planId" = p."id"
  AND p."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND (p."clientId" IS NULL OR p."clientId" = p."trainerId")
  AND f."name" = 'Black beans';
