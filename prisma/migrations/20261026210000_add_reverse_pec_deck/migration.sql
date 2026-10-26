-- Data migration, not a schema change: on one coach's Wed push day
-- (tpl_split_push), a Reverse Pec Deck follows the lateral raises.
--
-- The week's only direct rear-delt work was Friday's face pulls. A second
-- session, on the day that does the most pressing, gives the back of the
-- shoulder some of what the front gets. The coach asked for the machine rather
-- than dumbbell rear delt flys.
--
-- The builder recreates exercise rows on every save, so the row is anchored on
-- template id, owner email and the name of the row it follows, and the step is
-- a no-op if that row is gone or the template already has a reverse pec deck.
-- "order" runs 1..N across every section, so everything after the anchor moves
-- down one first, in the same statement.
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
    AND e."name" = 'Dumbbell Lateral Raise'
    AND NOT EXISTS (
      SELECT 1 FROM "TemplateExercise" f
      WHERE f."id" = 'tex_push_reverse_pec_deck'
         OR (f."templateId" = t."id" AND lower(f."name") = 'reverse pec deck')
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
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "rest", "notes", "order", "section")
SELECT 'tex_push_reverse_pec_deck', a."templateId", 'Reverse Pec Deck', '3', '12-20', '60s',
       'Face the pad, handles at shoulder height. Sweep your arms back until they line up with your body, leading with the elbows, and pause for a second. Keep your shoulders down: if your traps take over, the weight is too heavy. Alternate with the lateral raises if the machine is free.',
       a."order" + 1, a."section"
FROM anchor a;

-- Exercise catalog ---------------------------------------------------------
-- Mirrors recordExerciseNames. Not a shipped preset, so it is classified the
-- way /exercises would classify it.
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "discipline", "createdAt", "lastUsedAt")
SELECT 'trx_add_reverse_pec_deck', u."id", 'Reverse Pec Deck', 'reverse pec deck', 'STRENGTH', NOW(), NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
