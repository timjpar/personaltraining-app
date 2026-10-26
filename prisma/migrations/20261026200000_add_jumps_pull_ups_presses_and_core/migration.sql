-- Data migration, not a schema change: fits nine movements the coach asked for
-- into his week (data/strength-split, data/weekly-baseline), each on the day
-- where it costs his climbing the least. Nothing is removed.
--
--   Mon · Lower    Box Jump first, while the legs are fresh; Back Extension
--                  and Side Hyperextension after Hanging Leg Raise, so the day
--                  ends on core work from the front, back and side.
--   Wed · Push     Weighted Pull-Up after Bench Press, alternated with it. The
--                  middle of the week is as far as heavy pulling can get from
--                  Monday's max hangs and Saturday's project.
--   Fri · Post.    Close-Grip Bench Press after the RDLs (a second bench day,
--                  and a rest for the lower back between hinges), Seated Good
--                  Morning after the hip thrusts, Landmine Press after the
--                  chest-supported rows.
--   Tue · Recov.   Jefferson Curl after the foam rolling: light, loaded
--                  mobility rather than a strength lift.
--   Climb warm-up  Plate Halo after Shoulder CARs, on all four climbing days.
--
-- The coach edits these templates in the app, and the builder recreates every
-- exercise row on save, so no fixed id from the earlier migrations survives.
-- Each insert is anchored on template id, owner email and the exact name of
-- the row it goes beside. A missing anchor, or a movement the template already
-- has, makes that step a no-op.
--
-- "order" runs 1..N across every section, so each insert first moves the rows
-- below it down one. Steps run in order, because the later inserts on Friday
-- count on the earlier ones having already shifted the rows.
--
-- "WorkoutTemplate"."updatedAt" is deliberately untouched: the library sorts
-- on it, and the week was stamped to read Sunday to Saturday
-- (20261008190000_weekly_climbing_baseline).

DO $$
DECLARE
  r record;
  a record;
  at_order int;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- Mon · Lift: Lower Body (Quad-Biased)
      (1, 'tpl_split_lower', 'Back Squat', 'before', 'tex_add_lower_box_jump', 'Box Jump',
       '4', '3', NULL::text, '90s'::text,
       'First, while your legs are fresh. Use a box you land on softly, in the same quarter-squat you took off from, then step down. Don''t jump down. Every rep is a full-effort jump with a reset in between, and the set ends when a jump slows.'::text),
      (2, 'tpl_split_lower', 'Hanging Leg Raise', 'after', 'tex_add_lower_back_ext', 'Back Extension',
       '3', '12-15', 'Bodyweight', NULL,
       'On the 45° hyperextension bench, pad just below your hip bones. Rise until your body is straight and squeeze your glutes, but don''t arch past straight. Hug a plate once 15 is easy. Kept light so Friday''s hinges stay heavy.'),
      (3, 'tpl_split_lower', 'Back Extension', 'after', 'tex_add_lower_side_hyper', 'Side Hyperextension',
       '2', '12/side', 'Bodyweight', NULL,
       'Same bench, turned side-on with the pad under your hip. Lower sideways, then lift with the obliques on top. They hold your hips in when you flag or reach sideways.'),

      -- Wed · Lift: Push
      (4, 'tpl_split_push', 'Bench Press', 'after', 'tex_add_push_weighted_pull_up', 'Weighted Pull-Up',
       '4', '3-5', 'Leave 2 reps in the tank', '90s',
       'Alternate with your bench sets: bench, rest 90s, pull-up, rest 90s. Start every rep from a dead hang and finish with your chin over the bar. Add weight once all four sets reach 5.'),

      -- Fri · Lift: Posterior Chain + Light Pull
      (5, 'tpl_split_posterior', 'Romanian Deadlift', 'after', 'tex_add_post_cgbp', 'Close-Grip Bench Press',
       '3', '6-8', 'Leave 2 reps in the tank', '2 min',
       'Hands just inside shoulder width, elbows tucked about 45°. Your second bench session of the week: the same groove, with more triceps. It sits between the hinges so your lower back gets a rest.'),
      (6, 'tpl_split_posterior', 'Barbell Hip Thrust', 'after', 'tex_add_post_seated_gm', 'Seated Good Morning',
       '3', '8-10', 'Start with the empty bar', '90s',
       'Sit on the end of a bench, feet wide, bar on your upper back. Hinge forward with a flat back as far as you can control, then sit tall. This loads the lower back directly and the RDLs already worked it, so add weight slowly.'),
      (7, 'tpl_split_posterior', 'Chest-Supported Row', 'after', 'tex_add_post_landmine', 'Landmine Press',
       '3', '8-10/side', NULL, '60s',
       'Half-kneeling, pressing with the arm on the same side as the down knee. Press up and forward along the bar''s arc, and reach at the top. Easier on the shoulders than pressing overhead, and the kneeling stance makes it core work too.'),

      -- Tue · Recovery
      (8, 'tpl_base_tue_recovery', 'Foam Roll Glutes', 'after', 'tex_add_tue_jefferson', 'Jefferson Curl',
       '2', '8', 'Empty bar or 10-20 lb', NULL,
       'Stand on a box. Tuck your chin and roll down one vertebra at a time over 5 seconds, then roll back up. This is loaded mobility for the hamstrings and spine, so keep it light and never push depth into pain. Once it''s smooth, try the Zercher version, with the bar in the crooks of your elbows.'),

      -- Climbing warm-up, every climbing day
      (9,  'tpl_base_mon_climb', 'Shoulder CARs', 'after', 'tex_add_mon_climb_halo', 'Plate Halo', '2', '5 each way', '10-25 lb', NULL, NULL),
      (10, 'tpl_base_wed_climb', 'Shoulder CARs', 'after', 'tex_add_wed_climb_halo', 'Plate Halo', '2', '5 each way', '10-25 lb', NULL, NULL),
      (11, 'tpl_base_fri_climb', 'Shoulder CARs', 'after', 'tex_add_fri_climb_halo', 'Plate Halo', '2', '5 each way', '10-25 lb', NULL, NULL),
      (12, 'tpl_base_sat_climb', 'Shoulder CARs', 'after', 'tex_add_sat_climb_halo', 'Plate Halo', '2', '5 each way', '10-25 lb', NULL, NULL)
    ) AS v("step", "templateId", "anchor", "place", "id", "name", "sets", "reps", "load", "rest", "notes")
    ORDER BY "step"
  LOOP
    SELECT e."order", e."section" INTO a
    FROM "TemplateExercise" e
    JOIN "WorkoutTemplate" t ON t."id" = e."templateId"
    JOIN "User" u ON u."id" = t."trainerId"
    WHERE t."id" = r."templateId"
      AND lower(u."email") = 'timmyjparsons@gmail.com'
      AND e."name" = r."anchor"
    ORDER BY e."order"
    LIMIT 1;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM "TemplateExercise" f
      WHERE f."id" = r."id"
         OR (f."templateId" = r."templateId" AND lower(f."name") = lower(r."name"))
    ) THEN
      CONTINUE;
    END IF;

    at_order := a."order" + CASE r."place" WHEN 'after' THEN 1 ELSE 0 END;

    UPDATE "TemplateExercise"
    SET "order" = "order" + 1
    WHERE "templateId" = r."templateId"
      AND "order" >= at_order;

    INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "load", "rest", "notes", "order", "section")
    VALUES (r."id", r."templateId", r."name", r."sets", r."reps", r."load", r."rest",
            COALESCE(r."notes", 'Hold a plate by its edges, or a kettlebell upside down by the horns, and circle it close around your head. Ribs down and glutes tight, so your shoulders move and your lower back doesn''t. Keep it light: a 45 is strength work, not a warm-up.'),
            at_order, a."section");
  END LOOP;
END $$;

-- The push day's note said nothing on it competes with grip. Weighted pull-ups
-- now do, so the note says why they're here anyway.
UPDATE "WorkoutTemplate" t
SET "notes" = 'The safest day to run hard. Weighted pull-ups are its one grip-heavy lift, and they''re on Wednesday to stay as far as possible from Monday''s max hangs and Saturday''s project.'
FROM "User" u
WHERE t."id" = 'tpl_split_push'
  AND t."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com'
  AND t."notes" = 'The safest day to run hard — nothing here competes with grip or finger recovery.';

-- Exercise catalog ---------------------------------------------------------
-- Mirrors recordExerciseNames, which records every name a coach programs.
-- nameKey matches normalizeExerciseName in src/lib/exercise-presets.ts. Shipped
-- presets keep a null discipline, as an app save would leave them; the five
-- the catalog doesn't ship are classified the way /exercises would.
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "discipline", "createdAt", "lastUsedAt")
SELECT 'trx_add_' || v."slug", u."id", v."name", lower(v."name"), v."discipline", NOW(), NOW()
FROM "User" u
JOIN (VALUES
  -- Not in the shipped catalog
  ('plate_halo',          'Plate Halo',             'MOBILITY'::text),
  ('jefferson_curl',      'Jefferson Curl',         'MOBILITY'),
  ('seated_good_morning', 'Seated Good Morning',    'STRENGTH'),
  ('landmine_press',      'Landmine Press',         'STRENGTH'),
  ('side_hyperextension', 'Side Hyperextension',    'STRENGTH'),
  -- Shipped presets
  ('box_jump',            'Box Jump',               NULL),
  ('back_extension',      'Back Extension',         NULL),
  ('weighted_pull_up',    'Weighted Pull-Up',       NULL),
  ('close_grip_bench',    'Close-Grip Bench Press', NULL)
) AS v("slug", "name", "discipline") ON TRUE
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
