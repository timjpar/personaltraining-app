-- Data migration, not a schema change: loads a three-day strength split into
-- one coach's workout library.
--
-- It is here rather than in a script because production credentials are not
-- reachable from a developer machine (every Postgres var on the Vercel project
-- is marked Sensitive), and `build` runs `prisma migrate deploy` — so a
-- migration is the one context that can write to the production database.
--
-- Three rules keep it safe to run against production, and to re-run:
--
--   1. Every row has a fixed id, and every insert is ON CONFLICT DO NOTHING
--      with no conflict target — so it catches the primary key *and*
--      TrainerExercise's unique (trainerId, nameKey), and a second deploy of
--      the same migration is a no-op rather than a duplicate or an error.
--   2. The owner is resolved with a SELECT over "User", so a missed match
--      inserts zero rows instead of failing the build and taking the whole
--      deploy down with it.
--   3. The exercise rows join to the template by id, so they cannot outlive
--      rule 2 — no template, no exercises.
--
-- What it writes is what src/app/(trainer)/library/actions.ts writes when a
-- coach saves a workout: a WorkoutTemplate per day, its TemplateExercise rows
-- numbered 1..N in the MAIN section, and the TrainerExercise catalog names that
-- keep the picker's "Recent" honest. Nothing is assigned — these land in
-- /library ready to drop onto a client or onto the coach.

-- Day 1 --------------------------------------------------------------------
INSERT INTO "WorkoutTemplate" ("id", "title", "notes", "discipline", "trainerId", "createdAt", "updatedAt")
SELECT
  'tpl_split_lower',
  'Day 1 · Lower Body (Quad-Biased)',
  'Quad-biased on purpose. No heavy RDLs or deadlifts here — the posterior chain is saved for Day 3, so hamstrings and glutes aren''t cooked before a climbing session.',
  'STRENGTH',
  u."id",
  NOW(),
  NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "notes", "order", "section")
SELECT v."id", t."id", v."name", v."sets", v."reps", v."notes", v."order", 'MAIN'
FROM "WorkoutTemplate" t
JOIN (VALUES
  ('tex_split_lower_1', 'Back Squat',         '4', '6-8',    NULL::text, 1),
  ('tex_split_lower_2', 'Leg Press',          '3', '10-12',  NULL,       2),
  ('tex_split_lower_3', 'Walking Lunge',      '3', '12/leg', NULL,       3),
  ('tex_split_lower_4', 'Leg Extension',      '3', '12-15',  NULL,       4),
  ('tex_split_lower_5', 'Seated Calf Raise',  '4', '15',     NULL,       5),
  ('tex_split_lower_6', 'Hanging Leg Raise',  '3', '15',     'Cable crunch instead is fine — whichever is free.', 6)
) AS v("id", "name", "sets", "reps", "notes", "order") ON TRUE
WHERE t."id" = 'tpl_split_lower'
ON CONFLICT DO NOTHING;

-- Day 2 --------------------------------------------------------------------
INSERT INTO "WorkoutTemplate" ("id", "title", "notes", "discipline", "trainerId", "createdAt", "updatedAt")
SELECT
  'tpl_split_push',
  'Day 2 · Push (Chest, Shoulders, Triceps)',
  'The safest day to run hard — nothing here competes with grip or finger recovery.',
  'STRENGTH',
  u."id",
  NOW(),
  NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "notes", "order", "section")
SELECT v."id", t."id", v."name", v."sets", v."reps", v."notes", v."order", 'MAIN'
FROM "WorkoutTemplate" t
JOIN (VALUES
  ('tex_split_push_1', 'Bench Press',              '4', '6-8',   'Incline dumbbell bench is an equal swap.'::text, 1),
  ('tex_split_push_2', 'Dumbbell Shoulder Press',  '3', '8-10',  'Seated.',                                        2),
  ('tex_split_push_3', 'Chest Press Machine',      '3', '10-12', 'Cable chest press works the same.',              3),
  ('tex_split_push_4', 'Dumbbell Lateral Raise',   '3', '12-15', NULL,                                             4),
  ('tex_split_push_5', 'Dip',                      '3', '8-10',  'Close-grip bench is an equal swap.',             5),
  ('tex_split_push_6', 'Triceps Pushdown',         '3', '12-15', NULL,                                             6)
) AS v("id", "name", "sets", "reps", "notes", "order") ON TRUE
WHERE t."id" = 'tpl_split_push'
ON CONFLICT DO NOTHING;

-- Day 3 --------------------------------------------------------------------
INSERT INTO "WorkoutTemplate" ("id", "title", "notes", "discipline", "trainerId", "createdAt", "updatedAt")
SELECT
  'tpl_split_posterior',
  'Day 3 · Posterior Chain + Light Pull',
  'Hamstrings, glutes and upper back without adding to the grip fatigue climbing already generates. Deliberately no direct grip or forearm work, and no max-effort deadlifts.',
  'STRENGTH',
  u."id",
  NOW(),
  NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "notes", "order", "section")
SELECT v."id", t."id", v."name", v."sets", v."reps", v."notes", v."order", 'MAIN'
FROM "WorkoutTemplate" t
JOIN (VALUES
  ('tex_split_post_1', 'Romanian Deadlift',    '3', '6-8',   NULL::text,                         1),
  ('tex_split_post_2', 'Barbell Hip Thrust',   '3', '10-12', NULL,                               2),
  ('tex_split_post_3', 'Chest-Supported Row',  '3', '10-12', 'Machine — not weighted pull-ups.', 3),
  ('tex_split_post_4', 'Face Pull',            '3', '15-20', NULL,                               4),
  ('tex_split_post_5', 'Dumbbell Row',         '2', '10-12', 'Single-arm.',                      5)
) AS v("id", "name", "sets", "reps", "notes", "order") ON TRUE
WHERE t."id" = 'tpl_split_posterior'
ON CONFLICT DO NOTHING;

-- Exercise catalog ---------------------------------------------------------
-- Mirrors recordExerciseNames: every name the coach just had programmed, so
-- the picker's "Recent" reflects it and any demo video they attach later has a
-- row to attach to. nameKey is the display name lowercased and
-- whitespace-collapsed, matching normalizeExerciseName in
-- src/lib/exercise-presets.ts. All seventeen are shipped presets, so none of
-- them turn up under "My exercises".
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "createdAt", "lastUsedAt")
SELECT 'trx_split_' || v."slug", u."id", v."name", v."key", NOW(), NOW()
FROM "User" u
JOIN (VALUES
  ('back_squat',       'Back Squat',              'back squat'),
  ('leg_press',        'Leg Press',               'leg press'),
  ('walking_lunge',    'Walking Lunge',           'walking lunge'),
  ('leg_extension',    'Leg Extension',           'leg extension'),
  ('seated_calf',      'Seated Calf Raise',       'seated calf raise'),
  ('hanging_leg',      'Hanging Leg Raise',       'hanging leg raise'),
  ('bench_press',      'Bench Press',             'bench press'),
  ('db_shoulder',      'Dumbbell Shoulder Press', 'dumbbell shoulder press'),
  ('chest_press_mach', 'Chest Press Machine',     'chest press machine'),
  ('db_lateral',       'Dumbbell Lateral Raise',  'dumbbell lateral raise'),
  ('dip',              'Dip',                     'dip'),
  ('tri_pushdown',     'Triceps Pushdown',        'triceps pushdown'),
  ('rdl',              'Romanian Deadlift',       'romanian deadlift'),
  ('hip_thrust',       'Barbell Hip Thrust',      'barbell hip thrust'),
  ('cs_row',           'Chest-Supported Row',     'chest-supported row'),
  ('face_pull',        'Face Pull',               'face pull'),
  ('db_row',           'Dumbbell Row',            'dumbbell row')
) AS v("slug", "name", "key") ON TRUE
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
