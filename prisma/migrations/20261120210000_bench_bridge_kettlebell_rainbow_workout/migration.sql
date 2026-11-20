-- Data migration, not a schema change: puts a one-exercise workout, the Bench
-- Bridge Kettlebell Rainbow (the first move in reel DQKLYtmCFgm), into one
-- coach's workout library, ready to assign.
--
-- Same rules as 20260819131500_add_strength_split_workouts: fixed ids and an
-- untargeted ON CONFLICT DO NOTHING so a re-deploy is a no-op, the owner
-- resolved with a SELECT over "User" so a missed match writes nothing, and the
-- exercise row joined to the template by id so it can't outlive it.

INSERT INTO "WorkoutTemplate" ("id", "title", "notes", "discipline", "trainerId", "createdAt", "updatedAt")
SELECT
  'tpl_bridge_kb_rainbow',
  'Core · Bench Bridge Kettlebell Rainbow',
  'Shoulders on a bench, hips up level in a bridge. Hold one kettlebell by the horns with straight arms and sweep it in an arc over the chest: low beside one hip, up over the face, down past the other shoulder. The hips don''t sag or tip as the bell travels; the trunk turns only as far as the hips can stay up. Start light; the bell is a long lever.',
  'STRENGTH',
  u."id",
  NOW(),
  NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO "TemplateExercise" ("id", "templateId", "name", "sets", "reps", "weight", "rest", "notes", "order", "section")
SELECT v."id", t."id", v."name", v."sets", v."reps", v."weight", v."rest", v."notes", v."order", 'MAIN'
FROM "WorkoutTemplate" t
JOIN (VALUES
  ('tex_bridge_kb_rainbow_1', 'Bench Bridge Kettlebell Rainbow', '3', '8/side', '8-12 kg', '60s',
   'Squeeze the glutes and brace before each sweep. About 1.5 s per sweep with a brief pause low on each side. Arms stay straight; the bell goes only as low as you can keep the hips level.', 1)
) AS v("id", "name", "sets", "reps", "weight", "rest", "notes", "order") ON TRUE
WHERE t."id" = 'tpl_bridge_kb_rainbow'
ON CONFLICT DO NOTHING;

-- Exercise catalog, as recordExerciseNames would write it.
INSERT INTO "TrainerExercise" ("id", "trainerId", "name", "nameKey", "createdAt", "lastUsedAt")
SELECT 'trx_bridge_kb_rainbow', u."id", 'Bench Bridge Kettlebell Rainbow', 'bench bridge kettlebell rainbow', NOW(), NOW()
FROM "User" u
WHERE lower(u."email") = 'timmyjparsons@gmail.com'
ON CONFLICT DO NOTHING;
