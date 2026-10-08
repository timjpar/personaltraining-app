-- Data migration, not a schema change: builds out one coach's training week
-- around the three-day strength split already in their library
-- (20260819131500_add_strength_split_workouts, on data/strength-split).
--
--   Sun  Recovery — long easy run, yoga, sauna + plunge
--   Mon  Lift: Lower Body          + Climb: Fingers + Limit Bouldering
--   Tue  Recovery — easy run, hips, sauna + plunge
--   Wed  Lift: Push                + Climb: Volume + Technique
--   Thu  Recovery — easy run, shoulders, sauna + plunge
--   Fri  Lift: Posterior Chain     + Climb: Aerobic Base (ARC)
--   Sat  Climb: Project Day
--
-- The lifting days keep every exercise they had; only their titles change,
-- from "Day N" to the weekday each one now falls on. Every climbing day opens
-- with the same warm-up, written once below and copied into all four, so it
-- reads identically wherever it appears.
--
-- Same safety rules as the strength split, for the same reason (a migration is
-- the only context that can write to production):
--
--   1. Fixed ids and an untargeted ON CONFLICT DO NOTHING, so a second deploy
--      is a no-op.
--   2. The owner is resolved with a SELECT over "User", so a missed match
--      writes nothing rather than failing the build.
--   3. Exercise rows join to their template by id, so no template means no
--      exercises.
--   4. Each rename matches on the title it is replacing, so a template the
--      coach has already renamed in the app is left alone.
--
-- The library lists templates by "updatedAt" descending, so each template is
-- stamped a second apart to make the list read as the week does, Sunday at
-- the top.

-- Renames ------------------------------------------------------------------
UPDATE "WorkoutTemplate" t
SET "title" = v."title", "updatedAt" = NOW() - v."age"
FROM (VALUES
  ('tpl_split_lower',     'Day 1 · Lower Body (Quad-Biased)',         'Mon · Lift: Lower Body (Quad-Biased)',         interval '1 second'),
  ('tpl_split_push',      'Day 2 · Push (Chest, Shoulders, Triceps)', 'Wed · Lift: Push (Chest, Shoulders, Triceps)', interval '4 seconds'),
  ('tpl_split_posterior', 'Day 3 · Posterior Chain + Light Pull',     'Fri · Lift: Posterior Chain + Light Pull',     interval '7 seconds')
) AS v("id", "oldTitle", "title", "age"),
"User" u
WHERE t."id" = v."id"
  AND t."title" = v."oldTitle"
  AND t."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com';

-- The lower-body note pointed at "Day 3", which is now Friday.
UPDATE "WorkoutTemplate" t
SET "notes" = 'Quad-biased on purpose. No heavy RDLs or deadlifts here — the posterior chain is saved for Friday, so hamstrings and glutes aren''t cooked before a climbing session.'
FROM "User" u
WHERE t."id" = 'tpl_split_lower'
  AND t."notes" = 'Quad-biased on purpose. No heavy RDLs or deadlifts here — the posterior chain is saved for Day 3, so hamstrings and glutes aren''t cooked before a climbing session.'
  AND t."trainerId" = u."id"
  AND lower(u."email") = 'timmyjparsons@gmail.com';

-- New templates ------------------------------------------------------------
INSERT INTO "WorkoutTemplate" ("id", "title", "notes", "discipline", "trainerId", "createdAt", "updatedAt")
SELECT v."id", v."title", v."notes", v."discipline", u."id", NOW(), NOW() - v."age"
FROM "User" u
JOIN (VALUES
  ('tpl_base_sun_recovery',
   'Sun · Recovery: Long Easy Run, Yoga, Sauna + Plunge',
   'Fingers fully off — no hangboard, no "just one easy problem". Order: run, stretch while you''re warm, then sauna and plunge, ending on cold. Easy means easy: full sentences while running, heart rate under ~150 (180 − age). Easy aerobic work speeds recovery between climbing days; a tempo run on a rest day only adds fatigue.',
   'MOBILITY', interval '0 seconds'),
  ('tpl_base_mon_climb',
   'Mon · Climb: Fingers + Limit Bouldering',
   'The week''s hardest finger session, placed after Sunday off when your tendons are freshest. Climb before you lift if you can: limit boulders need fresh legs for high feet and heel hooks, and squats don''t need fresh fingers. If you do lift first, cut limit bouldering to 45 min. About 2 h with the warm-up.',
   'CLIMBING', interval '2 seconds'),
  ('tpl_base_tue_recovery',
   'Tue · Recovery: Easy Run, Hips, Sauna + Plunge',
   'The day after the heaviest leg day and the hardest finger day. Quads and glutes will be sore, so keep the run short and easy, and bike instead if the soreness changes your stride. The mobility work goes where squats and lunges tighten things up (quads, hip flexors, adductors), plus the hip turnout climbing needs for drop knees and frogging. Fingers off.',
   'MOBILITY', interval '3 seconds'),
  ('tpl_base_wed_climb',
   'Wed · Climb: Volume + Technique',
   'Moderate on purpose. Push day has already loaded your shoulders, so today is lots of good movement, not max effort. Lifting first is fine. Keep the pump under 6/10 and nothing at your limit. Once Monday and Saturday feel routine (4–6 weeks), this is the day to turn into power endurance with Boulder 4x4s.',
   'CLIMBING', interval '5 seconds'),
  ('tpl_base_thu_recovery',
   'Thu · Recovery: Easy Run, Shoulders, Sauna + Plunge',
   'The day after push and volume climbing, so chest, front delts and forearms are what''s tight. Tomorrow is posterior chain plus climbing: keep the run genuinely easy so your hamstrings arrive fresh. Fingers off.',
   'MOBILITY', interval '6 seconds'),
  ('tpl_base_fri_climb',
   'Fri · Climb: Aerobic Base (ARC)',
   'The easy one, on purpose, because tomorrow is project day. ARC builds the forearm aerobic base that shortens recovery between hard attempts. The pump never passes 3–4/10 and you could hold a conversation the whole time. Lifting first is fine. About 75 min with the warm-up.',
   'CLIMBING', interval '8 seconds'),
  ('tpl_base_sat_climb',
   'Sat · Climb: Project Day',
   'The second hard day, and the one to send on. Get outdoors when you can. It''s your second day on the wall in a row, so the warm-up is non-negotiable: if the ramp hangs feel off, make it a volume day and call that a win. Sunday is fully off fingers. About 2–2.5 h with the warm-up.',
   'CLIMBING', interval '9 seconds')
) AS v("id", "title", "notes", "discipline", "age") ON TRUE
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;

-- Climbing warm-up, rows 1–11 of every climbing day -------------------------
-- General, then shoulders and fingers, then easy wall time, then load through
-- the fingers, then grades — in that order, every time.
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "load", "rest", "notes", "order", "section")
SELECT 'tex_' || substr(t."id", 5) || '_w' || w."order", t."id", w."name", w."sets", w."reps", w."load", w."rest", w."notes", w."order", 'WARMUP'
FROM "WorkoutTemplate" t
JOIN (VALUES
  ('Jump Rope',                           '1',   '5 min',          NULL::text,         NULL::text, 'Or bike, row or jog, just to a light sweat. Skip it if you''ve come straight off the lifting floor warm.'::text, 1),
  ('Shoulder CARs',                       '1',   '5/side',         NULL,               NULL,       'Slow, through the biggest circle you own. No momentum.', 2),
  ('Thoracic Extension over Foam Roller', '1',   '10',             NULL,               NULL,       'Overhead reach starts in the mid-back, so open it before you hang off it.', 3),
  ('Wrist Circles',                       '1',   '20 each way',    NULL,               NULL,       'Then again with your fingers spread.', 4),
  ('Finger Rolls',                        '1',   '30',             NULL,               NULL,       'Open and close, then 30 more against a light band.', 5),
  ('Band Pull-Apart',                     '2',   '20',             NULL,               NULL,       NULL, 6),
  ('Shoulder External Rotation',          '2',   '15/side',        NULL,               NULL,       'Light band, elbow pinned to your side. Wakes up the rotator cuff that keeps the shoulder centred on big moves.', 7),
  ('Scapular Pull-Up',                    '2',   '8',              NULL,               NULL,       'From a dead hang, pull the shoulders down and back without bending the elbows, and hold the top for 2s. This is the first time today the shoulder takes your weight, so make each rep crisp.', 8),
  ('Easy Traverse',                       '1',   '5-8 min',        NULL,               NULL,       'Big holds, gradually steeper. Silent feet, straight arms, pump 0–2/10. You''re getting blood into the forearms, not training.', 9),
  ('Feet-On Hang Ramp',                   '4',   '10s',            '40 → 85% effort',  '1 min',    '20 mm edge, half-crimp, feet on a chair or the floor. Put a little more weight through your hands on each hang (roughly 40, 60, 75, 85%) and never go to failure. Any finger pain over 2/10 here turns today into an easy volume day, no exceptions.', 10),
  ('Warm-Up Boulder Ladder',              '4-6', '1 problem each', 'max −4 → max −1', '2 min',    'Step up the grades: your max −4, −3, −2, −1 (if your max is V6, that''s V2, V3, V4, V5). Flash each one. If a rung feels hard, repeat that grade instead of stepping up. On Wednesday and Friday, stop one rung below the day''s top grade. Done properly the whole warm-up takes 35–40 min.', 11)
) AS w("name", "sets", "reps", "load", "rest", "notes", "order") ON TRUE
WHERE t."id" IN ('tpl_base_mon_climb', 'tpl_base_wed_climb', 'tpl_base_fri_climb', 'tpl_base_sat_climb')
ON CONFLICT DO NOTHING;

-- Climbing days, from row 12 ------------------------------------------------
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "load", "rest", "notes", "order", "section")
SELECT v."id", v."templateId", v."name", v."sets", v."reps", v."load", v."rest", v."notes", v."order", v."section"
FROM "WorkoutTemplate" t
JOIN (VALUES
  -- Monday
  ('tex_base_mon_climb_12', 'tpl_base_mon_climb', 'Hangboard Max Hangs', '5',  '10s',       'BW ± to leave ~3s in the tank'::text, '3 min'::text, '20 mm edge, half-crimp, at a load you could hold ~13s. If you haven''t hangboarded consistently in the last 3 months, do 3 sets at bodyweight for the first 4 weeks: pulleys adapt more slowly than muscle.'::text, 12, 'MAIN'),
  ('tex_base_mon_climb_13', 'tpl_base_mon_climb', 'Limit Bouldering',    NULL, '60-75 min', NULL,                                  '3-5 min between attempts',      'Problems of 1–6 moves that you can''t flash, right at your ceiling. Give each one 3–5 quality attempts. Stop when you start falling off moves you did earlier: that means the session is over, not that you''re failing.', 13, 'MAIN'),
  ('tex_base_mon_climb_14', 'tpl_base_mon_climb', 'Easy Traverse',       '1',  '5 min',     NULL,                                  NULL,                            'Flush the forearms at a pump of 1/10.', 14, 'COOLDOWN'),
  ('tex_base_mon_climb_15', 'tpl_base_mon_climb', 'Reverse Wrist Curl',  '2',  '15',        'Light',                               NULL,                            'Works the extensors, which protects against climber''s elbow.', 15, 'COOLDOWN'),
  ('tex_base_mon_climb_16', 'tpl_base_mon_climb', 'Forearm Stretch',     '1',  '30s each way', NULL,                               NULL,                            NULL, 16, 'COOLDOWN'),

  -- Wednesday
  ('tex_base_wed_climb_12', 'tpl_base_wed_climb', 'Silent Feet Drill',    '1',  '3 problems',   NULL, NULL,      'Max −3. Every foot lands without a sound: place it, don''t stab.', 12, 'MAIN'),
  ('tex_base_wed_climb_13', 'tpl_base_wed_climb', 'Flagging Drill',       '1',  '3 problems',   NULL, NULL,      'Max −3. Flag on every move that allows it.', 13, 'MAIN'),
  ('tex_base_wed_climb_14', 'tpl_base_wed_climb', 'Down-Climbing',        '1',  '3 problems',   NULL, NULL,      'Climb up, then reverse it. Forces you to look at your feet.', 14, 'MAIN'),
  ('tex_base_wed_climb_15', 'tpl_base_wed_climb', 'Boulder Pyramid',      '1',  '40-45 min',    NULL, '1-2 min', 'Flash-level volume: 4 problems at max −3, 3 at max −2, 2 at max −1, then back down. Aim to flash. When you fall, name why (feet, hips or commitment) and give it one more go.', 15, 'MAIN'),
  ('tex_base_wed_climb_16', 'tpl_base_wed_climb', 'Hollow Body Hold',     '3',  '30s',          NULL, '45s',     'Keep your lower back pinned to the floor. This body tension is what keeps your feet on in steep terrain.', 16, 'MAIN'),
  ('tex_base_wed_climb_17', 'tpl_base_wed_climb', 'Easy Traverse',        '1',  '5 min',        NULL, NULL,      'Flush the forearms at a pump of 1/10.', 17, 'COOLDOWN'),
  ('tex_base_wed_climb_18', 'tpl_base_wed_climb', 'Band Wrist Extension', '2',  '20/side',      NULL, NULL,      NULL, 18, 'COOLDOWN'),
  ('tex_base_wed_climb_19', 'tpl_base_wed_climb', 'Doorway Pec Stretch',  '1',  '30s/side',     NULL, NULL,      'Undoes the bench press and the wall together.', 19, 'COOLDOWN'),
  ('tex_base_wed_climb_20', 'tpl_base_wed_climb', 'Forearm Stretch',      '1',  '30s each way', NULL, NULL,      NULL, 20, 'COOLDOWN'),

  -- Friday
  ('tex_base_fri_climb_12', 'tpl_base_fri_climb', 'ARC Training',    '3', '12-15 min',    NULL, '5 min', 'Continuous climbing: autobelay laps, a long traverse or a circuit, 3–4 grades below your max. If the pump climbs past 4/10, shake out on a jug or step down a grade, but don''t come off. Spend one round on silent feet and another on flagging.', 12, 'MAIN'),
  ('tex_base_fri_climb_13', 'tpl_base_fri_climb', 'Forearm Stretch', '1', '30s each way', NULL, NULL,    NULL, 13, 'COOLDOWN'),
  ('tex_base_fri_climb_14', 'tpl_base_fri_climb', 'Foam Roll Lats',  '1', '60s/side',     NULL, NULL,    'Rows plus climbing in one day: worth the minute.', 14, 'COOLDOWN'),
  ('tex_base_fri_climb_15', 'tpl_base_fri_climb', 'Rice Bucket Dig', '2', '60s',          NULL, NULL,    'This is for recovery, not training.', 15, 'COOLDOWN'),

  -- Saturday
  ('tex_base_sat_climb_12', 'tpl_base_sat_climb', 'Limit Bouldering', NULL, '75-90 min',    NULL, '3-5 min between attempts', 'Pick 1–2 projects at or just above your max, plus one you expect to send. Work the sections, then link them. Cap any single crux at 4–5 hard tries per session, because repeated max pulls on one hold are how pulleys go. Stop when quality drops.', 12, 'MAIN'),
  ('tex_base_sat_climb_13', 'tpl_base_sat_climb', 'Front Lever Tuck', '3',  '10s',          NULL, '90s',                      'Hollow body, hips level with your shoulders. Extend one leg only once 15s is easy. Calisthenics and climbing in one move.', 13, 'MAIN'),
  ('tex_base_sat_climb_14', 'tpl_base_sat_climb', 'Easy Traverse',    '1',  '5 min',        NULL, NULL,                       'Flush the forearms at a pump of 1/10.', 14, 'COOLDOWN'),
  ('tex_base_sat_climb_15', 'tpl_base_sat_climb', 'Pronator Twist',   '2',  '12/side',      NULL, NULL,                       'Use a hammer or a loaded bar. Direct elbow care.', 15, 'COOLDOWN'),
  ('tex_base_sat_climb_16', 'tpl_base_sat_climb', 'Forearm Stretch',  '1',  '30s each way', NULL, NULL,                       NULL, 16, 'COOLDOWN')
) AS v("id", "templateId", "name", "sets", "reps", "load", "rest", "notes", "order", "section") ON t."id" = v."templateId"
ON CONFLICT DO NOTHING;

-- Recovery days -------------------------------------------------------------
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "load", "rest", "notes", "order", "section")
SELECT v."id", v."templateId", v."name", v."sets", v."reps", NULL, NULL, v."notes", v."order", v."section"
FROM "WorkoutTemplate" t
JOIN (VALUES
  -- Sunday: long run, full-body yoga leaning on what Friday and Saturday used
  ('tex_base_sun_recovery_1',  'tpl_base_sun_recovery', 'Easy Walk',                '1', '5 min',            NULL::text, 1,  'WARMUP'),
  ('tex_base_sun_recovery_2',  'tpl_base_sun_recovery', 'Leg Swings',               '1', '10/side each way', NULL,       2,  'WARMUP'),
  ('tex_base_sun_recovery_3',  'tpl_base_sun_recovery', 'Outdoor Run',              '1', '40-50 min',        'Zone 2: conversational, heart rate under ~150. A treadmill works just as well.', 3, 'MAIN'),
  ('tex_base_sun_recovery_4',  'tpl_base_sun_recovery', 'Cat-Cow',                  '1', '10',               'Start of the stretch block. A 45–60 min yoga class can replace everything from here to Box Breathing.', 4, 'MAIN'),
  ('tex_base_sun_recovery_5',  'tpl_base_sun_recovery', 'World''s Greatest Stretch', '1', '5/side',          NULL,       5,  'MAIN'),
  ('tex_base_sun_recovery_6',  'tpl_base_sun_recovery', 'Thread the Needle',        '1', '8/side',           NULL,       6,  'MAIN'),
  ('tex_base_sun_recovery_7',  'tpl_base_sun_recovery', 'Child''s Pose',            '2', '60s',              'Walk your hands to each side to stretch the lats.', 7, 'MAIN'),
  ('tex_base_sun_recovery_8',  'tpl_base_sun_recovery', 'Foam Roll Lats',           '1', '60s/side',         NULL,       8,  'MAIN'),
  ('tex_base_sun_recovery_9',  'tpl_base_sun_recovery', 'Pigeon Stretch',           '2', '60s/side',         NULL,       9,  'MAIN'),
  ('tex_base_sun_recovery_10', 'tpl_base_sun_recovery', 'Hamstring Stretch',        '2', '45s/side',         NULL,       10, 'MAIN'),
  ('tex_base_sun_recovery_11', 'tpl_base_sun_recovery', 'Forearm Stretch',          '2', '30s each way',     'Two days on the wall in a row: give the flexors some time.', 11, 'MAIN'),
  ('tex_base_sun_recovery_12', 'tpl_base_sun_recovery', 'Box Breathing',            '1', '3 min',            'Down-shift before the heat.', 12, 'MAIN'),

  -- Tuesday: short run, legs and hips after Monday's squats
  ('tex_base_tue_recovery_1',  'tpl_base_tue_recovery', 'Easy Walk',         '1', '5 min',            NULL, 1, 'WARMUP'),
  ('tex_base_tue_recovery_2',  'tpl_base_tue_recovery', 'Leg Swings',        '1', '10/side each way', NULL, 2, 'WARMUP'),
  ('tex_base_tue_recovery_3',  'tpl_base_tue_recovery', 'Outdoor Run',       '1', '25-35 min',        'Zone 2, heart rate under ~150. If a jog hurts, switch to an easy bike: running on a changed gait is how sore turns into injured.', 3, 'MAIN'),
  ('tex_base_tue_recovery_4',  'tpl_base_tue_recovery', 'Foam Roll Quads',   '1', '60-90s/side',      NULL, 4, 'MAIN'),
  ('tex_base_tue_recovery_5',  'tpl_base_tue_recovery', 'Foam Roll Glutes',  '1', '60s/side',         NULL, 5, 'MAIN'),
  ('tex_base_tue_recovery_6',  'tpl_base_tue_recovery', 'Couch Stretch',     '2', '60s/side',         'Squeeze the glute of the down leg.', 6, 'MAIN'),
  ('tex_base_tue_recovery_7',  'tpl_base_tue_recovery', 'Pigeon Stretch',    '2', '60s/side',         NULL, 7, 'MAIN'),
  ('tex_base_tue_recovery_8',  'tpl_base_tue_recovery', '90/90 Hip Switch',  '2', '8/side',           'Sit tall and rotate both knees side to side without using your hands. Trains the hip rotation drop knees need.', 8, 'MAIN'),
  ('tex_base_tue_recovery_9',  'tpl_base_tue_recovery', 'Frog Stretch',      '2', '60s',              'Knees wide, then rock your hips back slowly. The turnout that gets your hips close to the wall.', 9, 'MAIN'),
  ('tex_base_tue_recovery_10', 'tpl_base_tue_recovery', 'Calf Stretch',      '1', '45s/side',         NULL, 10, 'MAIN'),
  ('tex_base_tue_recovery_11', 'tpl_base_tue_recovery', 'Box Breathing',     '1', '3 min',            'Down-shift before the heat.', 11, 'MAIN'),

  -- Thursday: run, chest, shoulders and forearms after Wednesday's push
  ('tex_base_thu_recovery_1',  'tpl_base_thu_recovery', 'Easy Walk',                           '1', '5 min',        NULL, 1, 'WARMUP'),
  ('tex_base_thu_recovery_2',  'tpl_base_thu_recovery', 'Arm Circles',                         '1', '10 each way',  NULL, 2, 'WARMUP'),
  ('tex_base_thu_recovery_3',  'tpl_base_thu_recovery', 'Outdoor Run',                         '1', '30-40 min',    'Zone 2, heart rate under ~150.', 3, 'MAIN'),
  ('tex_base_thu_recovery_4',  'tpl_base_thu_recovery', 'Thoracic Extension over Foam Roller', '1', '10',           NULL, 4, 'MAIN'),
  ('tex_base_thu_recovery_5',  'tpl_base_thu_recovery', 'Doorway Pec Stretch',                 '2', '45s/side',     NULL, 5, 'MAIN'),
  ('tex_base_thu_recovery_6',  'tpl_base_thu_recovery', 'Wall Slide',                          '2', '10',           'Ribs down, forearms on the wall. Builds shoulder-blade control overhead.', 6, 'MAIN'),
  ('tex_base_thu_recovery_7',  'tpl_base_thu_recovery', 'Thread the Needle',                   '1', '8/side',       NULL, 7, 'MAIN'),
  ('tex_base_thu_recovery_8',  'tpl_base_thu_recovery', 'Child''s Pose',                       '2', '60s',          'Walk your hands to each side to stretch the lats.', 8, 'MAIN'),
  ('tex_base_thu_recovery_9',  'tpl_base_thu_recovery', 'Forearm Stretch',                     '2', '30s each way', NULL, 9, 'MAIN'),
  ('tex_base_thu_recovery_10', 'tpl_base_thu_recovery', 'Supine Twist',                        '1', '60s/side',     NULL, 10, 'MAIN'),
  ('tex_base_thu_recovery_11', 'tpl_base_thu_recovery', 'Box Breathing',                       '1', '3 min',        'Down-shift before the heat.', 11, 'MAIN')
) AS v("id", "templateId", "name", "sets", "reps", "notes", "order", "section") ON t."id" = v."templateId"
ON CONFLICT DO NOTHING;

-- Sauna and plunge, the same close to all three recovery days, numbered on
-- from wherever each day's stretching ends.
INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "load", "rest", "notes", "order", "section")
SELECT 'tex_' || substr(t."id", 5) || '_c' || c."step", t."id", c."name", c."sets", c."reps", NULL, NULL, c."notes", d."lastMain" + c."step", 'COOLDOWN'
FROM "WorkoutTemplate" t
JOIN (VALUES
  ('tpl_base_sun_recovery', 12),
  ('tpl_base_tue_recovery', 11),
  ('tpl_base_thu_recovery', 11)
) AS d("templateId", "lastMain") ON t."id" = d."templateId"
JOIN (VALUES
  ('Sauna',       '3', '10-15 min', '80–90 °C (176–194 °F). Get out when you want to, not when the timer says so. Drink about 500 ml of water with electrolytes over the whole contrast.', 1),
  ('Cold Plunge', '3', '1 min',     '10–15 °C (50–59 °F), straight after each sauna round, and finish on cold. Long, slow exhales. About 3 min a day, 10 a week, is plenty. Rest days only: cold within ~6 h of lifting blunts strength and muscle gains.', 2)
) AS c("name", "sets", "reps", "notes", "step") ON TRUE
ON CONFLICT DO NOTHING;

-- Exercise catalog ---------------------------------------------------------
-- Mirrors recordExerciseNames for every name above (nameKey matches
-- normalizeExerciseName in src/lib/exercise-presets.ts). Shipped presets keep
-- a null discipline, exactly as an app save would leave them. The six names
-- the catalog doesn't ship are new to the coach's "My exercises", so they are
-- classified here the way /exercises would classify them.
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "discipline", "createdAt", "lastUsedAt")
SELECT 'trx_base_' || v."slug", u."id", v."name", lower(v."name"), v."discipline", NOW(), NOW()
FROM "User" u
JOIN (VALUES
  -- Not in the shipped catalog
  ('feet_on_hang_ramp',      'Feet-On Hang Ramp',                   'CLIMBING'::text),
  ('warmup_boulder_ladder',  'Warm-Up Boulder Ladder',              'CLIMBING'),
  ('sauna',                  'Sauna',                               'OTHER'),
  ('cold_plunge',            'Cold Plunge',                         'OTHER'),
  ('hip_90_90_switch',       '90/90 Hip Switch',                    'MOBILITY'),
  ('frog_stretch',           'Frog Stretch',                        'MOBILITY'),
  -- Shipped presets
  ('jump_rope',              'Jump Rope',                           NULL),
  ('shoulder_cars',          'Shoulder CARs',                       NULL),
  ('thoracic_ext_roller',    'Thoracic Extension over Foam Roller', NULL),
  ('wrist_circles',          'Wrist Circles',                       NULL),
  ('finger_rolls',           'Finger Rolls',                        NULL),
  ('band_pull_apart',        'Band Pull-Apart',                     NULL),
  ('shoulder_ext_rotation',  'Shoulder External Rotation',          NULL),
  ('scapular_pull_up',       'Scapular Pull-Up',                    NULL),
  ('easy_traverse',          'Easy Traverse',                       NULL),
  ('hangboard_max_hangs',    'Hangboard Max Hangs',                 NULL),
  ('limit_bouldering',       'Limit Bouldering',                    NULL),
  ('reverse_wrist_curl',     'Reverse Wrist Curl',                  NULL),
  ('forearm_stretch',        'Forearm Stretch',                     NULL),
  ('silent_feet_drill',      'Silent Feet Drill',                   NULL),
  ('flagging_drill',         'Flagging Drill',                      NULL),
  ('down_climbing',          'Down-Climbing',                       NULL),
  ('boulder_pyramid',        'Boulder Pyramid',                     NULL),
  ('hollow_body_hold',       'Hollow Body Hold',                    NULL),
  ('band_wrist_extension',   'Band Wrist Extension',                NULL),
  ('doorway_pec_stretch',    'Doorway Pec Stretch',                 NULL),
  ('arc_training',           'ARC Training',                        NULL),
  ('foam_roll_lats',         'Foam Roll Lats',                      NULL),
  ('rice_bucket_dig',        'Rice Bucket Dig',                     NULL),
  ('front_lever_tuck',       'Front Lever Tuck',                    NULL),
  ('pronator_twist',         'Pronator Twist',                      NULL),
  ('easy_walk',              'Easy Walk',                           NULL),
  ('leg_swings',             'Leg Swings',                          NULL),
  ('outdoor_run',            'Outdoor Run',                         NULL),
  ('cat_cow',                'Cat-Cow',                             NULL),
  ('worlds_greatest',        'World''s Greatest Stretch',           NULL),
  ('thread_the_needle',      'Thread the Needle',                   NULL),
  ('childs_pose',            'Child''s Pose',                       NULL),
  ('pigeon_stretch',         'Pigeon Stretch',                      NULL),
  ('hamstring_stretch',      'Hamstring Stretch',                   NULL),
  ('box_breathing',          'Box Breathing',                       NULL),
  ('foam_roll_quads',        'Foam Roll Quads',                     NULL),
  ('foam_roll_glutes',       'Foam Roll Glutes',                    NULL),
  ('couch_stretch',          'Couch Stretch',                       NULL),
  ('calf_stretch',           'Calf Stretch',                        NULL),
  ('arm_circles',            'Arm Circles',                         NULL),
  ('wall_slide',             'Wall Slide',                          NULL),
  ('supine_twist',           'Supine Twist',                        NULL)
) AS v("slug", "name", "discipline") ON TRUE
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
