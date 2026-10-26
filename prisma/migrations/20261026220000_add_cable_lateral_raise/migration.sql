-- Data migration, not a schema change: on one coach's Fri posterior day
-- (tpl_split_posterior), a Cable Lateral Raise follows the landmine press, and
-- the Wed push day's dip note stops offering close-grip bench as its swap.
--
-- Side delts got three sets a week, all of them Wednesday's dumbbell raises,
-- and pressing barely reaches them. A second session on Friday trains them
-- twice a week, and the cable keeps tension at the bottom of the rep, where a
-- dumbbell goes slack.
--
-- Close-grip bench is now its own lift on Friday
-- (20261026200000_add_jumps_pull_ups_presses_and_core), so a dip note that
-- offers it as a swap would mean pressing close-grip twice. The coach added
-- his own words after that sentence, so only the sentence is replaced.
--
-- The builder recreates exercise rows on every save, so rows are matched on
-- template id, owner email and the exact name or text being changed, and each
-- step is a no-op once its row has changed. "order" runs 1..N across every
-- section, so everything after the anchor moves down one first, in the same
-- statement.
--
-- "WorkoutTemplate"."updatedAt" is deliberately untouched: the library sorts
-- on it, and the week was stamped to read Sunday to Saturday
-- (20261008190000_weekly_climbing_baseline).

-- Cable Lateral Raise, after Landmine Press ---------------------------------
WITH anchor AS (
  SELECT e."templateId", e."order", e."section"
  FROM "TemplateExercise" e
  JOIN "WorkoutTemplate" t ON t."id" = e."templateId"
  JOIN "User" u ON u."id" = t."trainerId"
  WHERE t."id" = 'tpl_split_posterior'
    AND lower(u."email") = 'timmyjparsons@gmail.com'
    AND e."name" = 'Landmine Press'
    AND NOT EXISTS (
      SELECT 1 FROM "TemplateExercise" f
      WHERE f."id" = 'tex_post_cable_lateral_raise'
         OR (f."templateId" = t."id" AND lower(f."name") = 'cable lateral raise')
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
SELECT 'tex_post_cable_lateral_raise', a."templateId", 'Cable Lateral Raise', '3', '12-15/side', '60s',
       'Stand side-on to a low cable, one arm at a time. Raise out to the side to shoulder height, leading with the elbow, then lower slowly. This is your side delts'' second session of the week, after Wednesday''s dumbbell raises.',
       a."order" + 1, a."section"
FROM anchor a;

-- Dip note: a different swap -------------------------------------------------
UPDATE "TemplateExercise" e
SET "notes" = replace(e."notes", 'Close-grip bench is an equal swap.', 'Weighted push-ups are an equal swap.')
FROM "WorkoutTemplate" t, "User" u
WHERE e."templateId" = t."id"
  AND t."id" = 'tpl_split_push'
  AND t."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND e."name" = 'Dip'
  AND e."notes" LIKE '%Close-grip bench is an equal swap.%';

-- Exercise catalog ---------------------------------------------------------
-- Mirrors recordExerciseNames. A shipped preset, so the discipline stays null,
-- as an app save would leave it.
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "discipline", "createdAt", "lastUsedAt")
SELECT 'trx_add_cable_lateral_raise', u."id", 'Cable Lateral Raise', 'cable lateral raise', NULL, NOW(), NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
