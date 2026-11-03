// The shipped progression paths: ordered ladders of movements that lead from
// something most people can do to a skill they can't yet. Kept in code for the
// same reason the preset catalog is (see exercise-presets.ts): it works the
// moment it deploys, and adding a rung is a one-line edit. Athletes and coaches
// write their own on top of these — those live in the ProgressionPath table and
// are shaped into this same type by progression-view.ts.
//
// Data-only, plus the lookups that read it: the builder imports this directly.
//
// Every step carries its own coaching, not a description of the next one:
// `how` is how to train *this* movement, and `when` is when you've earned the
// next. That keeps a step readable on its own — in "See all paths" a step is
// often shown far from its neighbours — and it puts the readiness check on the
// movement the athlete is actually logging, which is the only history there is.
//
// `target` is `when` again in numbers, read against the last logged result for
// this step. Only reps and holds are checked: a target that depends on load
// ("a third of your bodyweight") stays prose, because a "Ready" badge that
// ignored the weight would be confidently wrong. Numbers are conventional
// coaching starting points, not tests — a coach overrides them by writing a
// path of their own.

import { DISCIPLINES, type Discipline } from "./constants";
import { normalizeExerciseName } from "./exercise-presets";

// "custom" is every path a person wrote, whatever it trains.
export type ProgressionFamily =
  | "bodyweight"
  | "core"
  | "climbing"
  | "strength"
  | "mobility"
  | "custom";

export const FAMILY_LABELS: Record<ProgressionFamily, string> = {
  bodyweight: "Bodyweight",
  core: "Core",
  climbing: "Climbing",
  strength: "Strength",
  mobility: "Mobility",
  custom: "Custom",
};

// Which session a family belongs to, so a climbing session's Hanging Leg Raise
// leads to a front lever and a strength session's to toes-to-bar. A custom path
// has no discipline of its own and is never pushed down for it.
const FAMILY_DISCIPLINE: Record<ProgressionFamily, Discipline | null> = {
  bodyweight: DISCIPLINES.STRENGTH,
  core: DISCIPLINES.STRENGTH,
  climbing: DISCIPLINES.CLIMBING,
  strength: DISCIPLINES.STRENGTH,
  mobility: DISCIPLINES.MOBILITY,
  custom: null,
};

// Sets of at least `reps` reps, or of at least `seconds` held. Exactly one of
// the two is set.
export type ProgressionTarget = {
  sets: number;
  reps?: number;
  seconds?: number;
};

export type ProgressionStep = {
  name: string;
  // Other names the same movement goes by in the catalog or in a coach's
  // programming, so "Hollow Body Hold" finds the hollow hold's paths.
  aka?: string[];
  how: string;
  // Absent only on the last step: there is nowhere further to go.
  when?: string;
  target?: ProgressionTarget;
  // How long people usually spend on this step before `when` comes true.
  weeks?: string;
};

export type ProgressionPath = {
  // A slug for shipped paths; "custom:<cuid>" for one an athlete or coach wrote.
  id: string;
  // The skill at the end — always the last step's name for a shipped path.
  goal: string;
  family: ProgressionFamily;
  blurb: string;
  steps: ProgressionStep[];
};

const reps = (sets: number, n: number): ProgressionTarget => ({ sets, reps: n });
const hold = (sets: number, seconds: number): ProgressionTarget => ({ sets, seconds });

export const PROGRESSION_PATHS: ProgressionPath[] = [
  // ---- Bodyweight ---------------------------------------------------------
  {
    id: "one-arm-push-up",
    goal: "One-Arm Push-Up",
    family: "bodyweight",
    blurb:
      "Pressing strength one side at a time. Each rung shifts more of your weight onto one hand.",
    steps: [
      {
        name: "Incline Push-Up",
        how: "Hands on a bench or bar, body one straight line from head to heels. 3 × 8–15, chest to the bench.",
        when: "3 × 15 at bench height, chest touching every rep.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Push-Up",
        how: "Hands under the shoulders, elbows about 45° from the body, chest to the floor. 3 × 8–20.",
        when: "3 × 20 with a full lockout and no sagging hips.",
        target: reps(3, 20),
        weeks: "4–8 weeks",
      },
      {
        name: "Deficit Push-Up",
        how: "Hands on plates or handles 5–10 cm up so the chest sinks below them. 3 × 8–12, 3s on the way down.",
        when: "3 × 12 with the chest below hand height every rep.",
        target: reps(3, 12),
        weeks: "3–6 weeks",
      },
      {
        name: "Archer Push-Up",
        how: "Hands wide. Lower towards one hand while the other arm stays straight and only steadies you. 3 × 5–8 per side.",
        when: "3 × 8 per side with the straight arm staying straight.",
        target: reps(3, 8),
        weeks: "6–10 weeks",
      },
      {
        name: "One-Arm Incline Push-Up",
        how: "One hand on a box or a bar in a rack, feet wide, free hand behind the back. Lower the box or bar every couple of weeks. 3 × 5–8 per side.",
        when: "3 × 6 per side with your hand at knee height or lower.",
        target: reps(3, 6),
        weeks: "6–12 weeks",
      },
      {
        name: "One-Arm Push-Up",
        how: "Feet wide, free hand behind the back, hips square to the floor — they will want to twist. 3 × 1–5 per side.",
      },
    ],
  },
  {
    id: "first-pull-up",
    goal: "Pull-Up",
    family: "bodyweight",
    blurb:
      "From no pull-ups to a first clean set. Rows build the pull and negatives build the strength to finish it.",
    steps: [
      {
        name: "Ring Row",
        how: "Rings at waist height, body straight, pull the rings to your ribs. 3 × 8–12. Walk the feet forward to make it harder.",
        when: "3 × 12 with your body close to horizontal.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Scapular Pull-Up",
        how: "From a dead hang, pull the shoulders down and back without bending the elbows, then let them rise. 3 × 10.",
        when: "3 × 10 with a 2s pause at the top, and a 30s dead hang.",
        target: reps(3, 10),
        weeks: "1–3 weeks",
      },
      {
        name: "Negative Pull-Up",
        how: "Jump or step up to chin over the bar, then lower for a slow count of five to a dead hang. 3 × 3–5.",
        when: "3 × 5 negatives that each take a full 5s.",
        target: reps(3, 5),
        weeks: "3–6 weeks",
      },
      {
        name: "Pull-Up",
        how: "Overhand grip, from a dead hang to chin over the bar, no kip. Start with singles and build to 3 × 5.",
      },
    ],
  },
  {
    id: "one-arm-pull-up",
    goal: "One-Arm Pull-Up",
    family: "bodyweight",
    blurb:
      "Load first, then lock-offs, then more and more weight onto one side. Months, not weeks — elbows adapt slower than muscle.",
    steps: [
      {
        name: "Pull-Up",
        how: "Strict, from a dead hang to chin over the bar. 3 × 6–12.",
        when: "3 × 12 strict, every rep from a dead hang.",
        target: reps(3, 12),
        weeks: "4–8 weeks",
      },
      {
        name: "Weighted Pull-Up",
        how: "Weight on a belt or vest. 5 × 3–5 at a load that makes the last rep slow but clean.",
        when: "5 × 5 with about a third of your bodyweight added.",
        weeks: "3–6 months",
      },
      {
        name: "Lock-Off Hold",
        how: "Pull up on two arms, let go with one, and hold at 90° and then 120° of elbow bend. Assist with fingers on a towel at first. 3 × 8s per angle, per arm.",
        when: "3 × 10s at 90° per arm without help.",
        target: hold(3, 10),
        weeks: "6–10 weeks",
      },
      {
        name: "Typewriter Pull-Up",
        how: "Pull up wide, then travel your chin across to each hand without dropping. 3 × 3 lengths.",
        when: "3 × 5 lengths without dropping below the bar.",
        target: reps(3, 5),
        weeks: "4–8 weeks",
      },
      {
        name: "Offset Pull-Up",
        how: "One hand on the bar, the other on a towel or ring hanging lower. The low hand helps, the high hand pulls. 3 × 4 per side.",
        when: "3 × 5 per side with the low hand at chest height.",
        target: reps(3, 5),
        weeks: "6–10 weeks",
      },
      {
        name: "Assisted One-Arm Pull-Up",
        how: "Pull with one arm while a band or two fingers of the other hand on a towel takes the rest. 4 × 2 per side.",
        when: "4 × 3 per side with only light help from the other hand.",
        target: reps(4, 3),
        weeks: "2–6 months",
      },
      {
        name: "One-Arm Pull-Up",
        how: "Dead hang on one arm, shoulder packed, legs still. Pull until the chin clears. 3–5 singles per side with full rest.",
      },
    ],
  },
  {
    id: "muscle-up",
    goal: "Muscle-Up",
    family: "bodyweight",
    blurb:
      "Pull high enough to get over the bar, then press out of it. Height is the skill; the dip is the easy part.",
    steps: [
      {
        name: "Pull-Up",
        how: "Strict, chin over the bar. 3 × 6–10.",
        when: "3 × 10 strict pull-ups.",
        target: reps(3, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Chest-to-Bar Pull-Up",
        how: "Pull until the chest touches the bar, elbows driving down and back. 3 × 3–6.",
        when: "3 × 6, every rep touching the chest.",
        target: reps(3, 6),
        weeks: "4–8 weeks",
      },
      {
        name: "Straight-Bar Dip",
        how: "Support on top of a straight bar, lean over it, lower the chest to the bar and press out. 3 × 5–10.",
        when: "3 × 10 with the chest touching the bar.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Explosive Pull-Up",
        how: "Pull as fast as you can, aiming the bar at your lower chest or waist. 5 × 3 with full rest — speed is the point.",
        when: "5 × 3 with the bar reaching your lower chest.",
        target: reps(5, 3),
        weeks: "4–8 weeks",
      },
      {
        name: "Negative Muscle-Up",
        how: "Start on top of the bar and lower slowly through the transition into a hang. 3 × 3, 5s each.",
        when: "3 × 3 negatives, controlled all the way through the transition.",
        target: reps(3, 3),
        weeks: "2–4 weeks",
      },
      {
        name: "Muscle-Up",
        how: "Grip slightly over the bar, pull explosively, bring the chest over early, press out. Singles first, then sets of 2–3.",
      },
    ],
  },
  {
    id: "pistol-squat",
    goal: "Pistol Squat",
    family: "bodyweight",
    blurb:
      "Single-leg strength and balance to a full-depth squat on one leg. Most people's limit is ankle range and balance, not strength.",
    steps: [
      {
        name: "Air Squat",
        how: "Feet shoulder width, sit down between the heels, chest up. 3 × 15–20.",
        when: "3 × 20 to full depth with heels down.",
        target: reps(3, 20),
        weeks: "2–4 weeks",
      },
      {
        name: "Reverse Lunge",
        how: "Step back, lower the back knee to just above the floor, front shin vertical. 3 × 8–12 per side.",
        when: "3 × 12 per side without touching down for balance.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Bulgarian Split Squat",
        how: "Back foot on a bench, sink until the front thigh is parallel. 3 × 8–12 per side.",
        when: "3 × 12 per side at bodyweight, full depth.",
        target: reps(3, 12),
        weeks: "3–6 weeks",
      },
      {
        name: "Box Pistol Squat",
        how: "On one leg, sit down to a box with the other leg out in front, then stand without rocking. Lower the box over the weeks. 3 × 5–8 per side.",
        when: "3 × 8 per side to a box at knee height or lower.",
        target: reps(3, 8),
        weeks: "4–8 weeks",
      },
      {
        name: "Assisted Pistol Squat",
        how: "Hold a post, door frame or TRX and go to full depth on one leg, using the hands less each week. 3 × 5 per side.",
        when: "3 × 5 per side with fingertip help only.",
        target: reps(3, 5),
        weeks: "3–6 weeks",
      },
      {
        name: "Pistol Squat",
        how: "Free leg straight out in front, arms forward, sit all the way down and stand. 3 × 3–5 per side. Hold a light plate out front if balance is the limit.",
      },
    ],
  },
  {
    id: "handstand-push-up",
    goal: "Deficit Handstand Push-Up",
    family: "bodyweight",
    blurb:
      "Overhead pressing with your own bodyweight, from a pike on the floor to a full-range press upside down.",
    steps: [
      {
        name: "Push-Up",
        how: "Full range, chest to the floor. 3 × 10–20.",
        when: "3 × 15 push-ups.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Pike Push-Up",
        how: "Hips high in an upside-down V, lower the top of the head to the floor in front of the hands. 3 × 6–12.",
        when: "3 × 12 with the head touching every rep.",
        target: reps(3, 12),
        weeks: "3–6 weeks",
      },
      {
        name: "Elevated Pike Push-Up",
        how: "The same pike with the feet on a box, so the hips stack over the shoulders. 3 × 5–10.",
        when: "3 × 10 with the feet at box height.",
        target: reps(3, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Handstand Hold",
        how: "Chest to the wall, hands a palm's width away, body straight and ribs down. 3 × 20–45s.",
        when: "3 × 45s chest-to-wall in a straight line.",
        target: hold(3, 45),
        weeks: "3–6 weeks",
      },
      {
        name: "Handstand Push-Up",
        how: "Back to the wall, lower the head to a pad so head and hands make a triangle, press to lockout. 3 × 3–8.",
        when: "3 × 8 to a thin pad.",
        target: reps(3, 8),
        weeks: "6–12 weeks",
      },
      {
        name: "Deficit Handstand Push-Up",
        how: "Hands on parallettes or plates so the head sinks below them. 3 × 3–6.",
      },
    ],
  },
  {
    id: "freestanding-handstand",
    goal: "Freestanding Handstand",
    family: "bodyweight",
    blurb:
      "Balance on your hands away from the wall. Practice little and often — balance is a skill, not a strength.",
    steps: [
      {
        name: "Plank",
        how: "On the hands, ribs down, glutes squeezed. 3 × 30–60s.",
        when: "3 × 60s without the hips sagging.",
        target: hold(3, 60),
        weeks: "1–3 weeks",
      },
      {
        name: "Handstand Hold",
        how: "Chest to the wall, hands a palm's width away, body straight. Pull the toes off the wall for a second at a time. 3 × 30–60s.",
        when: "3 × 60s chest-to-wall, and 5s with the toes off the wall.",
        target: hold(3, 60),
        weeks: "4–8 weeks",
      },
      {
        name: "Freestanding Handstand",
        how: "Kick up in open space, balance through the fingers, bail with a cartwheel. 10 min of attempts; note your best hold.",
      },
    ],
  },
  {
    id: "ring-dip",
    goal: "Ring Dip",
    family: "bodyweight",
    blurb:
      "From parallel bars to rings, where you have to make your own stability.",
    steps: [
      {
        name: "Dip",
        how: "Parallel bars, shoulders down, lower until the shoulders are just below the elbows. 3 × 5–12.",
        when: "3 × 12 to full depth.",
        target: reps(3, 12),
        weeks: "4–8 weeks",
      },
      {
        name: "Ring Support Hold",
        how: "Lock out on top of the rings, arms straight, rings by the hips and turned out. 3 × 15–30s.",
        when: "3 × 30s with the rings still.",
        target: hold(3, 30),
        weeks: "2–4 weeks",
      },
      {
        name: "Ring Dip",
        how: "Lower with the rings close to the body, press back to a turned-out lockout. 3 × 5–8. Use a band before adding weight.",
      },
    ],
  },
  {
    id: "nordic-curl",
    goal: "Nordic Hamstring Curl",
    family: "bodyweight",
    blurb:
      "Eccentric hamstring strength. Programmes built on it cut hamstring strains by about half in the trials.",
    steps: [
      {
        name: "Single-Leg Glute Bridge",
        how: "One foot down, drive the hips up until knee, hip and shoulder line up. 3 × 10–15 per side.",
        when: "3 × 15 per side with a 2s squeeze at the top.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Band-Assisted Nordic Curl",
        how: "Knees on a pad, ankles anchored, a band from above around the chest. Lower from the knees as slowly as you can. 3 × 4–6.",
        when: "3 × 6 controlled all the way down with a light band.",
        target: reps(3, 6),
        weeks: "4–6 weeks",
      },
      {
        name: "Nordic Hamstring Curl",
        aka: ["Nordic Curl"],
        how: "No band. Lower as slowly as you can with the hips straight, catch yourself on your hands, push back up. 2–3 × 3–6, twice a week.",
      },
    ],
  },

  // ---- Core ---------------------------------------------------------------
  {
    id: "l-sit",
    goal: "V-Sit",
    family: "core",
    blurb:
      "Compression strength: lifting the legs in front of you and holding them there.",
    steps: [
      {
        name: "Hollow Hold",
        aka: ["Hollow Body Hold"],
        how: "Lower back pressed to the floor, arms overhead, legs low. 3 × 20–40s.",
        when: "3 × 40s with the lower back flat.",
        target: hold(3, 40),
        weeks: "2–4 weeks",
      },
      {
        name: "Tuck L-Sit",
        how: "Hands on parallettes or blocks, push down, knees tucked to the chest, feet off the floor. 3 × 10–20s.",
        when: "3 × 20s with straight arms and the shoulders pushed down.",
        target: hold(3, 20),
        weeks: "3–6 weeks",
      },
      {
        name: "One-Leg L-Sit",
        how: "From the tuck, straighten one leg out in front. Switch legs each set. 3 × 10–15s per leg.",
        when: "3 × 15s per leg with the straight leg level with the hips.",
        target: hold(3, 15),
        weeks: "3–6 weeks",
      },
      {
        name: "L-Sit",
        how: "Both legs straight and together, level with the hips. 3 × 10–20s.",
        when: "3 × 20s with locked knees.",
        target: hold(3, 20),
        weeks: "6–12 weeks",
      },
      {
        name: "V-Sit",
        how: "From the L-sit, lift the legs higher while the shoulders lean back. 3 × 5–10s.",
      },
    ],
  },
  {
    id: "dragon-flag",
    goal: "Dragon Flag",
    family: "core",
    blurb:
      "The body as one stiff lever from the shoulders down. Lowering comes long before lifting.",
    steps: [
      {
        name: "Hollow Hold",
        aka: ["Hollow Body Hold"],
        how: "Lower back pressed to the floor, arms overhead, legs low. 3 × 30–45s.",
        when: "3 × 45s with the lower back flat throughout.",
        target: hold(3, 45),
        weeks: "2–4 weeks",
      },
      {
        name: "Hanging Leg Raise",
        how: "Straight legs, no swing, lower slower than you lift. 3 × 6–10.",
        when: "3 × 10 without swinging.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Tuck Dragon Flag",
        how: "Lying on a bench, hold the bench behind your head, lift the hips with the knees tucked, and lower slowly on the upper back. 3 × 5.",
        when: "3 × 6 slow lowerings with the hips in line.",
        target: reps(3, 6),
        weeks: "4–6 weeks",
      },
      {
        name: "Dragon Flag Negative",
        how: "Body straight from the shoulders, lower for five seconds without bending at the hips. 3 × 3–5.",
        when: "3 × 5 negatives that each take a full 5s.",
        target: reps(3, 5),
        weeks: "4–8 weeks",
      },
      {
        name: "Dragon Flag",
        how: "Lift and lower a straight body with only the upper back on the bench. 3 × 3–6.",
      },
    ],
  },
  {
    id: "toes-to-bar",
    goal: "Windshield Wiper",
    family: "core",
    blurb:
      "Hanging core strength, from knee raises to straight legs swept side to side.",
    steps: [
      {
        name: "Hanging Knee Raise",
        how: "Dead hang, knees to the chest, no swing. 3 × 10–15.",
        when: "3 × 15 without swinging.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Hanging Leg Raise",
        how: "Straight legs to hip height or higher, lower slower than you lift. 3 × 6–10.",
        when: "3 × 10 to at least hip height.",
        target: reps(3, 10),
        weeks: "4–6 weeks",
      },
      {
        name: "Toes-to-Bar",
        how: "Straight legs all the way to the bar, controlled, no kip. 3 × 5–8.",
        when: "3 × 8 strict.",
        target: reps(3, 8),
        weeks: "4–8 weeks",
      },
      {
        name: "Windshield Wiper",
        how: "Toes up at the bar, sweep the legs side to side under control. 3 × 4–6 per side.",
      },
    ],
  },
  {
    id: "ab-wheel",
    goal: "Standing Ab Wheel Rollout",
    family: "core",
    blurb:
      "Resisting a back that wants to arch, from a plank to rolling out from your feet.",
    steps: [
      {
        name: "Plank",
        how: "Forearms down, ribs down, glutes tight. 3 × 30–60s.",
        when: "3 × 60s without the hips sagging.",
        target: hold(3, 60),
        weeks: "1–3 weeks",
      },
      {
        name: "Ab Wheel Rollout",
        how: "From the knees, hips tucked, roll out as far as you can without the back arching. 3 × 6–10.",
        when: "3 × 10 from the knees to full extension.",
        target: reps(3, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Standing Ab Wheel Rollout",
        how: "From the feet. Roll into a wall at first to shorten the range, and move the wall back over the weeks. 3 × 3–6.",
      },
    ],
  },
  {
    id: "copenhagen",
    goal: "Copenhagen Plank",
    family: "core",
    blurb:
      "Adductor strength — the groin-injury prevention exercise with the best evidence in field sports.",
    steps: [
      {
        name: "Side Plank",
        how: "Elbow under the shoulder, hips high, body straight. 3 × 30–45s per side.",
        when: "3 × 45s per side.",
        target: hold(3, 45),
        weeks: "2–3 weeks",
      },
      {
        name: "Copenhagen Plank",
        how: "Top leg on a bench, bottom leg free. Knee on the bench first, then the ankle. 3 × 15–30s per side.",
      },
    ],
  },

  // ---- Climbing -----------------------------------------------------------
  {
    id: "front-lever",
    goal: "Front Lever",
    family: "climbing",
    blurb:
      "Body horizontal under the bar — the classic test of the tension that keeps your feet on steep walls.",
    steps: [
      {
        name: "Hanging Leg Raise",
        how: "Straight legs, no swing. 3 × 8.",
        when: "3 × 10 straight-leg raises without swinging.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Front Lever Tuck",
        how: "Hips level with the shoulders, knees to the chest, arms straight. 3 × 10s.",
        when: "3 × 15s with a flat back and level hips.",
        target: hold(3, 15),
        weeks: "4–8 weeks",
      },
      {
        name: "Front Lever Raise",
        how: "From a hang, raise to a tuck lever with straight arms and lower slowly. 3 × 5.",
        when: "3 × 5 slow raises without bending the arms.",
        target: reps(3, 5),
        weeks: "3–6 weeks",
      },
      {
        name: "Advanced Tuck Front Lever",
        how: "The tuck with a flat back and the hips opened so the thighs sit at 90° to the body. 3 × 8–12s.",
        when: "3 × 12s with a flat back.",
        target: hold(3, 12),
        weeks: "2–4 months",
      },
      {
        name: "Straddle Front Lever",
        how: "Legs straight and wide apart, body horizontal. 3 × 5–10s.",
        when: "3 × 8s.",
        target: hold(3, 8),
        weeks: "3–6 months",
      },
      {
        name: "Front Lever",
        how: "Legs together, body straight and horizontal, arms locked. 3 × 3–10s.",
      },
    ],
  },
  {
    id: "one-arm-hang",
    goal: "One-Arm Hang",
    family: "climbing",
    blurb:
      "Finger strength, built slowly. Tendons and pulleys adapt over months, so the weeks below are minimums, not targets.",
    steps: [
      {
        name: "Dead Hang",
        how: "Two hands on a jug or a 20mm edge, shoulders engaged, elbows soft. 3 × 10–30s.",
        when: "3 × 30s on a 20mm edge with active shoulders.",
        target: hold(3, 30),
        weeks: "4–8 weeks",
      },
      {
        name: "Open-Hand Hang",
        how: "Four fingers draped over a 20mm edge, no thumb. 5 × 10s.",
        when: "5 × 10s on 20mm at bodyweight.",
        target: hold(5, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Half-Crimp Hang",
        how: "Fingers bent to 90°, thumb off. 5 × 10s on 20mm.",
        when: "5 × 10s on 20mm in a half crimp.",
        target: hold(5, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Hangboard Repeaters",
        how: "7s on, 3s off, six times is one set. 4–6 sets with 3 min rest, on an edge you can hold for 10s.",
        when: "All six sets on 20mm at bodyweight without cutting a rep short.",
        weeks: "6–10 weeks",
      },
      {
        name: "Hangboard Max Hangs",
        aka: ["Max Hangs"],
        how: "10s at a load you could hold for about 13s. 4–5 sets with 3 min rest. Strength, not fatigue.",
        when: "10s hangs on 20mm with 30–40% of your bodyweight added.",
        weeks: "6–12 months",
      },
      {
        name: "One-Arm Assisted Hang",
        how: "One arm, with a pulley or a foot on a chair taking 20–40% off. 3 × 8s per side.",
        when: "3 × 10s per side with less than 10% taken off.",
        weeks: "3–6 months",
      },
      {
        name: "One-Arm Hang",
        how: "One arm, shoulder engaged, a jug first and then 20mm. 3–5 × 5–10s per side.",
      },
    ],
  },
  {
    id: "two-finger-pocket",
    goal: "Two-Finger Pocket Hang",
    family: "climbing",
    blurb: "Pocket strength for the climbs that ask for it. Years, not months.",
    steps: [
      {
        name: "Three-Finger Drag",
        how: "Index, middle and ring fingers, open hand. 3 × 10s per hand.",
        when: "3 × 10s at bodyweight on 20mm, after years of steady climbing.",
        target: hold(3, 10),
        weeks: "6–12 months",
      },
      {
        name: "Two-Finger Pocket Hang",
        how: "Middle two fingers only, with assistance. 5–7s holds.",
      },
    ],
  },
  {
    id: "campus",
    goal: "Campus Board Bumps",
    family: "climbing",
    blurb:
      "Contact strength and power. Only for climbers with years of finger training, and never tired or cold.",
    steps: [
      {
        name: "Foot-On Campusing",
        how: "Feet on the kicker board, move hand to hand up the rungs. 4–6 laps, stopping while every move is crisp.",
        when: "Smooth 1-3-5 reaches with feet on, after at least two years of regular climbing.",
        weeks: "4–8 weeks",
      },
      {
        name: "Campus Board Ladder",
        how: "1-3-5 up, match, then down-climb. 4–6 ladders, fully warm and rested.",
        when: "1-3-5 ladders feel controlled and you can match at the top.",
        weeks: "2–4 months",
      },
      {
        name: "Campus Board Bumps",
        how: "1-2-3-4 with one hand without matching. Advanced athletes only.",
      },
    ],
  },
  {
    id: "climbing-endurance",
    goal: "Boulder 4x4",
    family: "climbing",
    blurb:
      "From an aerobic base to holding on through sustained hard climbing.",
    steps: [
      {
        name: "ARC Training",
        how: "20–40 min of continuous easy traversing at a light pump that never builds.",
        when: "30 min sessions twice a week with no pump creeping in.",
        weeks: "4–6 weeks",
      },
      {
        name: "Route Laps",
        how: "Two laps back to back on a route two grades below your limit. 4–6 sets, resting as long as you climbed.",
        when: "Six doubles without coming off.",
        weeks: "3–4 weeks",
      },
      {
        name: "Route Intervals",
        how: "On the wall for 3 min, off for 3 min, six times. Sustained, not desperate.",
        when: "All six intervals at the same grade.",
        weeks: "3–4 weeks",
      },
      {
        name: "Boulder 4x4",
        how: "Four problems, four times through, with minimal rest inside a round and 3–4 min between rounds.",
      },
    ],
  },

  // ---- Strength -----------------------------------------------------------
  {
    id: "back-squat",
    goal: "Back Squat",
    family: "strength",
    blurb: "Learning to squat under a bar, one variable at a time.",
    steps: [
      {
        name: "Air Squat",
        how: "To full depth, heels down. 3 × 15–20.",
        when: "3 × 20 with the heels down and the knees over the toes.",
        target: reps(3, 20),
        weeks: "1–2 weeks",
      },
      {
        name: "Goblet Squat",
        aka: ["Kettlebell Goblet Squat"],
        how: "Dumbbell or kettlebell held at the chest, elbows inside the knees at the bottom. 3 × 8–12.",
        when: "3 × 10 with about a third of your bodyweight and an upright torso.",
        weeks: "3–6 weeks",
      },
      {
        name: "Box Squat",
        how: "Bar on the back, sit to a box at parallel, pause, stand. 3 × 5–8.",
        when: "3 × 8 at around bodyweight with the same depth every rep.",
        weeks: "3–6 weeks",
      },
      {
        name: "Back Squat",
        how: "Free squat to at least parallel. Add weight once every set reaches the top of the rep range.",
      },
    ],
  },
  {
    id: "overhead-squat",
    goal: "Overhead Squat",
    family: "strength",
    blurb:
      "Squat depth, upper-back strength and shoulder range in one lift — and the bottom position of the snatch.",
    steps: [
      {
        name: "Back Squat",
        how: "To at least parallel. 3–5 × 5.",
        when: "Bodyweight on the bar for 5 to full depth.",
        weeks: "2–3 months",
      },
      {
        name: "Front Squat",
        how: "Bar on the front of the shoulders, elbows high, torso upright. 3–5 × 3–5.",
        when: "Front squat about 80% of your back squat for 3.",
        weeks: "1–3 months",
      },
      {
        name: "Overhead Squat",
        how: "Wide grip, bar locked out over the middle of the foot, squat to depth. Start with a PVC pipe. 5 × 3.",
      },
    ],
  },
  {
    id: "deadlift",
    goal: "Deficit Deadlift",
    family: "strength",
    blurb: "Hinge from the hips, then pull from the floor, then from below it.",
    steps: [
      {
        name: "Dumbbell Romanian Deadlift",
        how: "Soft knees, push the hips back, dumbbells close to the legs, back flat. 3 × 8–12.",
        when: "3 × 12 to mid-shin with a flat back.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Romanian Deadlift",
        how: "Barbell from standing, hips back until the hamstrings stop you, bar sliding down the legs. 3 × 6–10.",
        when: "3 × 8 at about bodyweight with a flat back.",
        weeks: "4–6 weeks",
      },
      {
        name: "Deadlift",
        how: "Bar over the middle of the foot, shins to the bar, push the floor away. 3–5 × 3–5.",
        when: "1.5 × bodyweight for 5 with no change in back position.",
        weeks: "3–6 months",
      },
      {
        name: "Deficit Deadlift",
        how: "Stand on a 2–5 cm plate to pull through more range. 3 × 3–5 at 70–80% of your deadlift.",
      },
    ],
  },
  {
    id: "hip-thrust",
    goal: "Barbell Hip Thrust",
    family: "strength",
    blurb: "Glute strength through full hip extension.",
    steps: [
      {
        name: "Glute Bridge",
        how: "Feet flat, drive through the heels, squeeze at the top. 3 × 12–20.",
        when: "3 × 20 with a 2s squeeze at the top.",
        target: reps(3, 20),
        weeks: "1–3 weeks",
      },
      {
        name: "Single-Leg Glute Bridge",
        how: "One foot down, hips level all the way up. 3 × 10–15 per side.",
        when: "3 × 15 per side without the hips dropping.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Barbell Hip Thrust",
        aka: ["Hip Thrust"],
        how: "Upper back on a bench, padded bar over the hips, chin tucked, ribs down. 3 × 8–12.",
      },
    ],
  },
  {
    id: "clean",
    goal: "Clean & Jerk",
    family: "strength",
    blurb:
      "The clean taught from the top down — finish the pull, then catch it lower — with the jerk added at the end.",
    steps: [
      {
        name: "Deadlift",
        how: "Clean-width grip, shoulders over the bar. 3 × 5.",
        when: "Bodyweight for 5 with a flat back.",
        weeks: "2–4 weeks",
      },
      {
        name: "Clean Pull",
        how: "From the floor, extend hard through the hips and shrug, arms long. 3–5 × 3.",
        when: "Every pull finishes in full extension.",
        weeks: "2–4 weeks",
      },
      {
        name: "Hang Power Clean",
        how: "From above the knee, jump and pull yourself under, catch high in the front rack. 5 × 3.",
        when: "Fast elbows and a quiet catch on every rep.",
        weeks: "4–6 weeks",
      },
      {
        name: "Power Clean",
        how: "From the floor, caught above parallel. 5 × 2–3.",
        when: "Power clean about 70% of your front squat with the same catch every time.",
        weeks: "2–3 months",
      },
      {
        name: "Hang Clean",
        how: "From the hang, ride the catch down into a full front squat. 5 × 2–3.",
        when: "Comfortable catching in a full squat from the hang.",
        weeks: "4–8 weeks",
      },
      {
        name: "Clean",
        how: "From the floor into a full front squat catch. 5 × 1–2.",
        when: "Cleans at 80% of your best are consistent.",
        weeks: "2–3 months",
      },
      {
        name: "Clean & Jerk",
        how: "Clean, stand, set the grip, then dip, drive and jerk. Singles and doubles.",
      },
    ],
  },
  {
    id: "snatch",
    goal: "Snatch",
    family: "strength",
    blurb: "The fastest lift there is, learned from the overhead position down.",
    steps: [
      {
        name: "Overhead Squat",
        how: "PVC first, then a barbell. 5 × 3 with a pause at the bottom.",
        when: "Overhead squat 50–60% of your back squat for 3 with a still bar.",
        weeks: "1–2 months",
      },
      {
        name: "Snatch Pull",
        how: "Wide grip, pull from the floor through full extension. 3–5 × 3.",
        when: "Every pull finishes tall.",
        weeks: "2–4 weeks",
      },
      {
        name: "Hang Snatch",
        how: "From above the knee, pull and drop under into the overhead squat. 5 × 2–3.",
        when: "Consistent catches without the bar drifting forward.",
        weeks: "1–2 months",
      },
      {
        name: "Power Snatch",
        how: "From the floor, caught above parallel. 5 × 2.",
        when: "Power snatches are consistent and you want to receive lower.",
        weeks: "1–2 months",
      },
      {
        name: "Snatch",
        how: "From the floor to a full overhead squat catch. 5 × 1–2.",
      },
    ],
  },
  {
    id: "jerk",
    goal: "Split Jerk",
    family: "strength",
    blurb: "From pressing overhead to driving the bar up and moving under it.",
    steps: [
      {
        name: "Overhead Press",
        how: "Strict, glutes tight, bar close to the face. 3–5 × 5.",
        when: "60% of your bodyweight for 5.",
        weeks: "2–3 months",
      },
      {
        name: "Push Press",
        how: "Short dip, drive with the legs, press to finish. 5 × 3.",
        when: "Push press about 1.3 × your strict press.",
        weeks: "4–8 weeks",
      },
      {
        name: "Push Jerk",
        how: "Dip, drive, and push yourself under the bar into a quarter squat with locked arms. 5 × 2–3.",
        when: "Landing with locked arms and a still bar.",
        weeks: "4–8 weeks",
      },
      {
        name: "Split Jerk",
        how: "Dip, drive, split the feet front and back, recover the front foot first. 5 × 1–2.",
      },
    ],
  },
  {
    id: "kettlebell-snatch",
    goal: "Kettlebell Snatch",
    family: "strength",
    blurb: "The hip hinge made ballistic, then taken overhead.",
    steps: [
      {
        name: "Kettlebell Swing",
        how: "Hike the bell back, snap the hips, float it to chest height with relaxed arms. 5 × 10–15.",
        when: "5 × 15 with a moderate bell and a crisp hip snap.",
        target: reps(5, 15),
        weeks: "3–6 weeks",
      },
      {
        name: "Kettlebell Clean",
        how: "Keep the bell close so the forearm meets it softly in the rack, no banging. 3 × 5 per side.",
        when: "3 × 8 per side with a quiet rack.",
        target: reps(3, 8),
        weeks: "3–4 weeks",
      },
      {
        name: "Kettlebell Snatch",
        how: "Swing, pull the bell close, and punch the hand through at the top to lock out overhead. 5 × 5 per side.",
      },
    ],
  },
  {
    id: "depth-jump",
    goal: "Depth Jump",
    family: "strength",
    blurb:
      "Reactive power: landing and leaving the ground again as fast as you can.",
    steps: [
      {
        name: "Box Jump",
        how: "Jump to land softly on the box, then step down. 4 × 3–5 with full rest.",
        when: "4 × 5 landing quietly on a mid-height box.",
        target: reps(4, 5),
        weeks: "3–6 weeks",
      },
      {
        name: "Depth Jump",
        how: "Step off a 30–45 cm box, land, and jump straight up as fast as you can. 3–4 × 3–5 with full rest.",
      },
    ],
  },

  // ---- Mobility -----------------------------------------------------------
  {
    id: "front-split",
    goal: "Front Split",
    family: "mobility",
    blurb: "Hip flexor and hamstring length, worked from both ends.",
    steps: [
      {
        name: "Hip Flexor Stretch",
        how: "Half-kneeling, tuck the pelvis under, then shift forward. 2 × 45s per side.",
        when: "The back hip opens fully without the lower back arching.",
        weeks: "2–3 weeks",
      },
      {
        name: "Couch Stretch",
        how: "Back knee in the corner of a wall or couch, shin up the wall, torso upright. 2 × 60s per side.",
        when: "2 × 60s per side with the torso upright against the wall.",
        target: hold(2, 60),
        weeks: "3–6 weeks",
      },
      {
        name: "Half Split",
        how: "Kneel, front leg straight, hips over the back knee, hinge forward with a flat back. 3 × 30–60s per side.",
        when: "Hands flat on the floor with the front leg straight.",
        weeks: "4–8 weeks",
      },
      {
        name: "Front Split",
        how: "Slide into the split on yoga blocks with the hips square, lowering the blocks over the weeks. 3 × 30–60s per side.",
      },
    ],
  },
  {
    id: "pancake",
    goal: "Pancake Stretch",
    family: "mobility",
    blurb: "Hamstring and adductor length for a wide forward fold.",
    steps: [
      {
        name: "Seated Forward Fold",
        how: "Legs straight, hinge from the hips with a long back. 3 × 30–60s.",
        when: "Hands reach the toes with a flat back.",
        weeks: "2–4 weeks",
      },
      {
        name: "Frog Stretch",
        how: "On all fours, knees wide, shins parallel, rock the hips back. 2 × 60s.",
        when: "The hips sit back level with the knees.",
        weeks: "3–6 weeks",
      },
      {
        name: "Pancake Stretch",
        how: "Legs wide and straight, toes up, fold forward from the hips. 3 × 45–60s. Add a light plate once the fold is easy.",
      },
    ],
  },
  {
    id: "jefferson-curl",
    goal: "Zercher Jefferson Curl",
    family: "mobility",
    blurb: "Loaded spinal flexion, built up a vertebra at a time and kept light.",
    steps: [
      {
        name: "Seated Forward Fold",
        how: "Legs straight, let the back round and relax into the fold. 3 × 30–60s.",
        when: "Relaxed in a rounded fold for 60s.",
        weeks: "2–3 weeks",
      },
      {
        name: "Jefferson Curl",
        how: "Standing on a box, roll down one vertebra at a time holding a light plate, then roll back up. 2–3 × 5–8, slow.",
        when: "3 × 8 with 10–20% of your bodyweight and no pain.",
        weeks: "1–3 months",
      },
      {
        name: "Zercher Jefferson Curl",
        how: "Bar cradled in the elbows, roll down and up the same way. Light, 2–3 × 5.",
      },
    ],
  },
  {
    id: "full-bridge",
    goal: "Full Bridge",
    family: "mobility",
    blurb: "Back and shoulder extension to a full backbend.",
    steps: [
      {
        name: "Glute Bridge",
        how: "Drive the hips up and squeeze. 3 × 15.",
        when: "3 × 15 with a 3s hold at the top.",
        target: reps(3, 15),
        weeks: "1–2 weeks",
      },
      {
        name: "Thoracic Extension over Foam Roller",
        how: "Roller across the mid-back, hands behind the head, extend over it at a few levels. 2 × 10.",
        when: "Lying on your back, arms overhead rest flat on the floor.",
        weeks: "2–4 weeks",
      },
      {
        name: "Full Bridge",
        how: "On your back, hands by the ears, press up through the hands and feet until the arms are straight. 3 × 10–30s.",
      },
    ],
  },
];

// The goal a movement starts on when it sits on several paths and the general
// rule (below) would pick the wrong one. Keyed by normalized name.
const AUTO_PATH: Record<string, string> = {
  "pull-up": "one-arm-pull-up",
  "push-up": "one-arm-push-up",
  "hollow hold": "l-sit",
  "hollow body hold": "l-sit",
  "hanging leg raise": "toes-to-bar",
  plank: "ab-wheel",
  "air squat": "pistol-squat",
  "single-leg glute bridge": "hip-thrust",
  "seated forward fold": "pancake",
  "glute bridge": "hip-thrust",
  "handstand hold": "freestanding-handstand",
};

export const PATHS_BY_ID: Map<string, ProgressionPath> = new Map(
  PROGRESSION_PATHS.map((p) => [p.id, p]),
);

// Where a movement sits on a path, matched on the normalized name or any aka.
// -1 when it isn't on it.
export function stepIndex(path: ProgressionPath, name: string): number {
  const key = normalizeExerciseName(name);
  if (!key) return -1;
  return path.steps.findIndex(
    (s) =>
      normalizeExerciseName(s.name) === key ||
      (s.aka ?? []).some((a) => normalizeExerciseName(a) === key),
  );
}

export type PathPlace = { path: ProgressionPath; index: number };

// Every path a movement sits on, in the order an athlete would want to be
// offered them: paths that still lead somewhere first (Pull-Up is the end of
// "First Pull-Up" but the start of two better stories), then paths from the
// session's own discipline, then the catalog's order. `paths` defaults to the
// shipped catalog; callers with custom paths pass them in front of it.
export function pathsThrough(
  name: string,
  {
    paths = PROGRESSION_PATHS,
    discipline,
  }: { paths?: ProgressionPath[]; discipline?: Discipline } = {},
): PathPlace[] {
  const found: PathPlace[] = [];
  for (const path of paths) {
    const index = stepIndex(path, name);
    if (index >= 0) found.push({ path, index });
  }
  const preferred = AUTO_PATH[normalizeExerciseName(name)];
  const rank = ({ path, index }: PathPlace) => {
    const atTop = index === path.steps.length - 1;
    const family = FAMILY_DISCIPLINE[path.family];
    const offDiscipline = Boolean(discipline && family && family !== discipline);
    return (atTop ? 4 : 0) + (offDiscipline ? 2 : 0) + (path.id === preferred ? 0 : 1);
  };
  // Array.prototype.sort is stable, so equal ranks keep the order given.
  return found.sort((a, b) => rank(a) - rank(b));
}

// The `when` of a step in a few characters, for the badge beside it.
export function targetLabel(target: ProgressionTarget | undefined): string | null {
  if (!target) return null;
  if (target.seconds != null) return `${target.sets} × ${target.seconds}s`;
  if (target.reps != null) return `${target.sets} × ${target.reps}`;
  return null;
}
