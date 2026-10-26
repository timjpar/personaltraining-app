-- Data migration, not a schema change: on one coach's Wed push day
-- (tpl_split_push, from data/strength-split), Chest Press Machine becomes an
-- Incline Dumbbell Press and a Cable Fly follows it.
--
-- Chest Press Machine repeated the bench press at a lighter load: the same flat
-- angle on the same muscles. Incline Dumbbell Press keeps a compound press but
-- moves it to the upper chest; Cable Fly adds chest work that costs the triceps
-- and front delts nothing, so the dips later in the session aren't done on
-- tired arms.
--
-- The coach edits this template in the app, and the builder recreates every
-- exercise row on save, so no fixed exercise id from the original migration
-- survives. Rows are matched on template id, owner email and the exact name
-- (or note) being replaced instead. Each step is a no-op once its row has
-- changed, so a second deploy, or the same edit made in the app first, leaves
-- the template alone.
--
-- "WorkoutTemplate"."updatedAt" is deliberately untouched: the library sorts
-- on it, and the week was stamped to read Sunday to Saturday
-- (20261008190000_weekly_climbing_baseline).

-- Chest Press Machine -> Incline Dumbbell Press ------------------------------
UPDATE "TemplateExercise" e
SET "name" = 'Incline Dumbbell Press',
    "reps" = '8-12',
    "notes" = 'Bench at about 30°.'
FROM "WorkoutTemplate" t, "User" u
WHERE e."templateId" = t."id"
  AND t."id" = 'tpl_split_push'
  AND t."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND e."name" = 'Chest Press Machine';

-- Cable Fly, straight after it -----------------------------------------------
-- "order" runs 1..N across every section, so everything after the incline
-- press moves down one to make room. One statement, so the shift and the
-- insert happen together or not at all.
WITH anchor AS (
  SELECT e."templateId", e."order", e."section"
  FROM "TemplateExercise" e
  JOIN "WorkoutTemplate" t ON t."id" = e."templateId"
  JOIN "User" u ON u."id" = t."trainerId"
  WHERE t."id" = 'tpl_split_push'
    AND lower(u."email") = 'timmyjparsons@gmail.com'
    AND e."name" = 'Incline Dumbbell Press'
    AND NOT EXISTS (
      SELECT 1 FROM "TemplateExercise" f
      WHERE f."templateId" = t."id" AND lower(f."name") = 'cable fly'
    )
  ORDER BY e."order"
  LIMIT 1
), shifted AS (
  UPDATE "TemplateExercise" e
  SET "order" = e."order" + 1
  FROM anchor a
  WHERE e."templateId" = a."templateId"
    AND e."order" > a."order"
  RETURNING e."id"
)
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "notes", "order", "section")
SELECT 'tex_push_cable_fly', a."templateId", 'Cable Fly', '3', '12-15',
       'Handles at shoulder height. Slow through the stretch.', a."order" + 1, a."section"
FROM anchor a
ON CONFLICT DO NOTHING;

-- The bench press note offered incline dumbbell as a swap, which would now
-- mean pressing incline twice.
UPDATE "TemplateExercise" e
SET "notes" = 'Dumbbell bench press is an equal swap.'
FROM "WorkoutTemplate" t, "User" u
WHERE e."templateId" = t."id"
  AND t."id" = 'tpl_split_push'
  AND t."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND e."name" = 'Bench Press'
  AND e."notes" = 'Incline dumbbell bench is an equal swap.';
