-- Data migration, not a schema change: on one coach's Wed push day
-- (tpl_split_push), Deficit Push-Ups come right before the bench press.
--
-- The coach asked for them there. With the hands on plates the chest sinks
-- past the hands, a deeper stretch than the bench allows, and the shoulder
-- blades move freely instead of being pinned to a bench. Kept to two sets
-- short of failure so they warm the chest and shoulders up for bench rather
-- than tire them; cable flys already come first.
--
-- The builder recreates exercise rows on every save, so the row is anchored on
-- template id, owner email and the name of the row it precedes, and the step
-- is a no-op if that row is gone or the template already has a deficit
-- push-up. "order" runs 1..N across every section, so the bench and everything
-- after it move down one first, in the same statement. The coach had moved
-- Cable Fly to the top himself, so the bench is matched by name, not position.
--
-- "WorkoutTemplate"."updatedAt" is deliberately untouched: the library sorts
-- on it, and the week was stamped to read Sunday to Saturday
-- (20261008190000_weekly_climbing_baseline).

WITH anchor AS (
  SELECT e."templateId", e."order", e."section"
  FROM "TemplateExercise" e
  JOIN "WorkoutTemplate" t ON t."id" = e."templateId"
  JOIN "User" u ON u."id" = t."trainerId"
  WHERE t."id" = 'tpl_split_push'
    AND lower(u."email") = 'timmyjparsons@gmail.com'
    AND e."name" = 'Bench Press'
    AND NOT EXISTS (
      SELECT 1 FROM "TemplateExercise" f
      WHERE f."id" = 'tex_push_deficit_push_up'
         OR (f."templateId" = t."id" AND lower(f."name") = 'deficit push-up')
    )
  ORDER BY e."order"
  LIMIT 1
), shifted AS (
  UPDATE "TemplateExercise" e
  SET "order" = e."order" + 1
  FROM anchor a
  WHERE e."templateId" = a."templateId"
    AND e."order" >= a."order"
  RETURNING e."id"
)
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "rest", "notes", "order", "section")
SELECT 'tex_push_deficit_push_up', a."templateId", 'Deficit Push-Up', '2', '8-10', '60s',
       'Hands on two stacked plates or push-up handles, 2-4 in high and a little wider than your shoulders. Lower for 3 seconds until your chest passes your hands, pause a second in the stretch, then push. Stop about 3 reps short of failure: these get the chest and shoulders ready for bench, not tired.',
       a."order", a."section"
FROM anchor a;

-- Exercise catalog ---------------------------------------------------------
-- Mirrors recordExerciseNames. A shipped preset as of this change, so the
-- discipline stays null, as an app save would leave it.
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "discipline", "createdAt", "lastUsedAt")
SELECT 'trx_add_deficit_push_up', u."id", 'Deficit Push-Up', 'deficit push-up', NULL, NOW(), NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
