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
    id: "scapular-push-up",
    goal: "Push-Up Plus",
    family: "bodyweight",
    blurb:
      "Shoulder-blade control and serratus strength for pressing, handstands and shoulders that stay healthy. The elbows stay locked on every rung, and only the shoulder blades move: they pinch as the chest sinks and spread as it rises. Each rung puts more of your weight through your hands, then adds a plate, then puts the movement at the top of a full push-up.",
    steps: [
      {
        name: "Wall Scapular Push-Up",
        aka: ["Wall Scap Push-Up", "Wall Scapula Push-Up"],
        how: "Stand a step back from a wall with your hands flat on it at shoulder height and your arms straight. Let your chest sink toward the wall as your shoulder blades pinch, then push the wall away by spreading them. Your elbows never bend. 2–3 × 12–15.",
        when: "3 × 15 with a 2s hold at the top, elbows locked the whole time.",
        target: reps(3, 15),
        weeks: "1–2 weeks",
      },
      {
        name: "Incline Scapular Push-Up",
        aka: ["Incline Scap Push-Up", "Bench Scapular Push-Up"],
        how: "Hands on a bench, body one straight line from head to heels, arms locked. Sink between your shoulder blades, then spread them to push the bench away. 3 × 10–15.",
        when: "3 × 15 with a 2s hold at the top and your hips in line.",
        target: reps(3, 15),
        weeks: "1–3 weeks",
      },
      {
        name: "Kneeling Scapular Push-Up",
        aka: ["Kneeling Scap Push-Up", "Knee Scapular Push-Up"],
        how: "On your knees with your hands under your shoulders and your body straight from knees to head. Same movement: sink between the blades, then spread them as far as they go. 3 × 12–15.",
        when: "3 × 15 with a 2s hold at the top, hips not piking.",
        target: reps(3, 15),
        weeks: "1–3 weeks",
      },
      {
        name: "Scapular Push-Up",
        aka: ["Scap Push-Up", "Scapula Push-Up", "Plank Scapular Push-Up"],
        how: "Full plank on your hands, arms locked, glutes and abs tight. Let your chest sink until your shoulder blades touch, then push the floor away until your upper back rounds slightly. 3 × 10–15.",
        when: "3 × 15 with a 2s hold at the top and no sag at the hips.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Decline Scapular Push-Up",
        aka: ["Decline Scap Push-Up", "Feet-Elevated Scapular Push-Up"],
        how: "Feet up on a bench, hands on the floor under your shoulders, arms locked. More of your weight goes through your hands, so the spread is harder to finish. 3 × 10–12.",
        when: "3 × 12 with a 2s hold at the top.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Weighted Scapular Push-Up",
        aka: ["Weighted Scap Push-Up", "Plate Scapular Push-Up"],
        how: "Plank on the floor with a plate across your upper back (a partner places it, or slide it on from a bench). Start at 5–10 kg. Same locked arms, full sink and full spread. 3 × 8–12.",
        when: "3 × 12 with a 2s hold at the top under a plate of about a fifth of your bodyweight.",
        weeks: "3–6 weeks",
      },
      {
        name: "Push-Up Plus",
        aka: ["Push Up Plus", "Push-Up with Protraction", "Serratus Push-Up"],
        how: "A full push-up, chest to the floor. At the top, once your elbows lock, keep pushing: spread your shoulder blades and push the floor a little further away, and hold 1s. Lower with your shoulder blades pinching. 3 × 8–12.",
      },
    ],
  },
  {
    id: "palm-raise",
    goal: "Decline Plank Palm Raise",
    family: "bodyweight",
    blurb:
      "Wrist and finger strength for handstands, planche work and wrists that stop aching under load. On every rung the fingers stay flat and spread on the floor while the heels of the hands peel up, so the forearm muscles that grip the floor take your weight. Each rung puts more of your body over your hands.",
    steps: [
      {
        name: "Quadruped Palm Raise",
        aka: ["All-Fours Palm Raise", "Quadruped Palm Lift-Off"],
        how: "On all fours, hips over knees, hands under shoulders with the fingers spread and pointing forward. Press the fingers into the floor and lift the heels of both hands as high as you can, pause 1s, and lower slowly. Arms stay straight. 2–3 × 10–15.",
        when: "3 × 15 with a 1s pause at the top and the fingers flat the whole time.",
        target: reps(3, 15),
        weeks: "1–2 weeks",
      },
      {
        name: "Kneeling Palm Raise",
        aka: ["Knee Plank Palm Raise", "Kneeling Palm Lift-Off"],
        how: "A plank on your knees, body straight from knees to head, hands under your shoulders. Same lift: fingers pinned, heels of the hands up, slow down. If the heels barely move, lean less weight forward and build range first. 3 × 10–12.",
        when: "3 × 12 with the heels clearly off the floor on every rep.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Plank Palm Raise",
        aka: ["Palm Raise", "Plank Palm Lift-Off", "Palm Lift-Off"],
        how: "Full plank on your hands, arms locked, glutes and abs tight. Lift the heels of both hands while the fingers stay flat, pause, and lower under control. Let your shoulders drift a little forward over your fingers as the palms rise. 3 × 8–12.",
        when: "3 × 12 with a 1s pause at the top and no bend at the elbows.",
        target: reps(3, 12),
        weeks: "2–6 weeks",
      },
      {
        name: "Decline Plank Palm Raise",
        aka: ["Feet-Elevated Palm Raise", "Decline Palm Raise"],
        how: "Feet up on a bench, hands on the floor under your shoulders. More of your weight sits over your hands, closer to a handstand. Same flat fingers, heels up, slow down. 3 × 8–10.",
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
        name: "Wide-Grip Pull-Up",
        aka: ["Wide Grip Pull-Up", "Wide Pull-Up"],
        how: "Hands about one and a half shoulder-widths apart, elbows driving down and out, until the chin clears the bar. Crossing the ankles behind keeps the legs still. 3 × 5–8.",
        when: "3 × 8 strict, chin over the bar on every rep.",
        target: reps(3, 8),
        weeks: "4–8 weeks",
      },
      {
        name: "Lock-Off Hold",
        how: "Pull up on two arms, let go with one, and hold at 90° and then 120° of elbow bend. Assist with fingers on a towel at first. 3 × 8s per angle, per arm.",
        when: "3 × 10s at 90° per arm without help.",
        target: hold(3, 10),
        weeks: "6–10 weeks",
      },
      {
        name: "Archer Pull-Up",
        how: "Grip very wide. Pull up beside one hand while the other arm straightens along the bar, lower to a dead hang, then go to the other side. Start as a half archer with the far arm still bent, and widen the grip a little at a time. 3 × 3 per side.",
        when: "3 × 5 per side with the far arm straight.",
        target: reps(3, 5),
        weeks: "4–8 weeks",
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
    id: "muscle-down",
    goal: "Muscle-Down",
    family: "bodyweight",
    blurb:
      "Lower from the top of the bar to a dead hang without dropping. It builds the transition from the strong end and lets you link muscle-ups instead of jumping back up each rep.",
    steps: [
      {
        name: "Straight-Bar Support Hold",
        aka: ["Bar Support Hold", "Straight Bar Support"],
        how: "Jump or step to support on top of the bar, arms locked, shoulders pushed down, hips touching the bar. 3 × 20–30s.",
        when: "3 × 30s with locked arms and no shrugging.",
        target: hold(3, 30),
        weeks: "1–3 weeks",
      },
      {
        name: "Straight-Bar Dip",
        how: "From the support, lean over the bar, lower the chest to it and press out. 3 × 5–10.",
        when: "3 × 10 with the chest touching the bar.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Negative Muscle-Up",
        aka: ["Muscle-Up Negative"],
        how: "Jump to the top, then lower through the dip and the transition into a hang. 3 × 3, about 5s each.",
        when: "3 × 3 with no drop at the transition.",
        target: reps(3, 3),
        weeks: "2–4 weeks",
      },
      {
        name: "Muscle-Down",
        aka: ["Muscle Down", "Muscle-Up Lowering", "Controlled Muscle-Down"],
        how: "Start in support on top. Lower to the bottom of the dip and pause 2s, roll the elbows under the bar and pause 2s in the transition, then lower to a dead hang. 3 × 3, 8–10s each.",
      },
    ],
  },
  {
    id: "back-lever",
    goal: "Back Lever",
    family: "bodyweight",
    blurb:
      "Face-down and level under the bar with the arms straight behind you. The shoulders have to open into extension before any strength work, so it starts with hanging, then levers out from a tuck the way the front lever does.",
    steps: [
      {
        name: "German Hang",
        aka: ["German Hang Hold"],
        how: "From a hang, tuck and roll back between your arms until your feet point at the floor behind you, then hang there on straight arms. Toes on a box take some weight at first. 3 × 15–30s.",
        when: "3 × 30s relaxed, with no pinching at the front of the shoulder.",
        target: hold(3, 30),
        weeks: "2–4 weeks",
      },
      {
        name: "Skin the Cat",
        how: "Tuck and roll back through an inverted hang into a German hang, then come back the same way, slowly, arms straight the whole time. 3 × 3–5.",
        when: "3 × 5 smooth reps both ways without kicking.",
        target: reps(3, 5),
        weeks: "2–4 weeks",
      },
      {
        name: "Tuck Back Lever",
        aka: ["Back Lever Tuck"],
        how: "From an inverted hang, lower until the back is level, knees pulled to the chest and arms locked. 3 × 8–12s.",
        when: "3 × 15s with the hips level with the shoulders.",
        target: hold(3, 15),
        weeks: "3–6 weeks",
      },
      {
        name: "Advanced Tuck Back Lever",
        how: "The tuck with a flat back and the hips opened so the thighs sit at 90° to the body. 3 × 8–12s.",
        when: "3 × 12s with a flat back.",
        target: hold(3, 12),
        weeks: "4–8 weeks",
      },
      {
        name: "Straddle Back Lever",
        how: "Legs straight and wide, body level, glutes squeezed so the hips neither pike nor sag. 3 × 5–10s.",
        when: "3 × 8s.",
        target: hold(3, 8),
        weeks: "2–4 months",
      },
      {
        name: "Back Lever",
        aka: ["Full Back Lever"],
        how: "Legs together, body straight and level, arms locked behind you with the hands over the lower back. Lower into it from an inverted hang and hold. 3 × 3–10s.",
      },
    ],
  },
  {
    id: "hang-to-rear-support",
    goal: "Hang to Rear Support",
    family: "bodyweight",
    blurb:
      "From a wide dead hang to rear support on top of the bar, the bar sliding down your back the whole way. The second half is the climb out of a back lever into rear support, so that comes before the full move.",
    steps: [
      {
        name: "Korean Dip",
        how: "From rear support, lower until the bar reaches your lower back, chest pitched forward, then press back to straight arms. 3 × 3–8.",
        when: "3 × 8 with the bar reaching your lower back.",
        target: reps(3, 8),
        weeks: "4–8 weeks",
      },
      {
        name: "Back Lever",
        aka: ["Full Back Lever"],
        how: "Legs together, body straight and level, arms locked behind you. 3 × 3–10s.",
        when: "3 × 8s.",
        target: hold(3, 8),
        weeks: "1–3 months",
      },
      {
        name: "Rear Support to Back Lever",
        aka: ["Korean Dip to Back Lever", "Back Lever from Rear Support"],
        how: "From rear support, lean forward and let the elbows bend so the bar rolls up to your lower back as the legs come up level. Push away until the arms are straight in a back lever, hold 2–3s, then come back up the same way. 3 × 2–3.",
        when: "3 × 3, back up to rear support every time without bending at the hips.",
        target: reps(3, 3),
        weeks: "1–3 months",
      },
      {
        name: "Hang to Rear Support",
        aka: ["Pull to Rear Support"],
        how: "Grip wide. From a dead hang, pitch the chest forward under the bar and press the bar down your back on straight arms, out through a T, until it sits behind your hips. Singles first, then sets of 2–3.",
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
    id: "shrimp-squat",
    goal: "Advanced Shrimp Squat",
    family: "bodyweight",
    blurb:
      "Single-leg strength with the free knee folded behind you. Very quad-heavy, and it asks less of the hamstrings than a pistol because the free leg never has to reach forward.",
    steps: [
      {
        name: "Reverse Lunge",
        how: "Step back, lower the back knee to just above the floor, front shin close to vertical. 3 × 8–12 per side.",
        when: "3 × 12 per side without touching down for balance.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Bulgarian Split Squat",
        how: "Back foot on a bench, sink until the back knee is a few centimetres off the floor. 3 × 8–12 per side.",
        when: "3 × 12 per side at bodyweight, the back knee near the floor every rep.",
        target: reps(3, 12),
        weeks: "3–6 weeks",
      },
      {
        name: "Assisted Shrimp Squat",
        how: "On one leg with the other knee bent behind you, hold a post or door frame and lower until the back knee touches a pad just behind the standing heel. Use the hands less each week. 3 × 5–8 per side.",
        when: "3 × 8 per side with fingertip help only.",
        target: reps(3, 8),
        weeks: "3–6 weeks",
      },
      {
        name: "Shrimp Squat",
        aka: ["Hands-Free Shrimp Squat"],
        how: "Hands free, arms reaching forward. Keep the back thigh in line with the trunk and let the back knee drop straight down to a pad behind the standing heel; lean the chest forward as far as balance needs. 3 × 3–6 per side.",
        when: "3 × 6 per side, the knee touching softly and the back foot staying off the floor.",
        target: reps(3, 6),
        weeks: "4–8 weeks",
      },
      {
        name: "Advanced Shrimp Squat",
        how: "Hold the back foot up behind you with the same-side hand so only the knee touches. The trunk has to stay taller, so the standing leg does more. 3 × 3–5 per side.",
      },
    ],
  },
  {
    id: "dragon-squat",
    goal: "Dragon Squat",
    family: "bodyweight",
    blurb:
      "A pistol with the free leg threaded behind the standing leg. It adds deep hip rotation and balance to pistol-level strength, so build the pistol first.",
    steps: [
      {
        name: "Pistol Squat",
        how: "Free leg straight out in front, sit all the way down and stand without the free foot touching. 3 × 3–5 per side.",
        when: "3 × 5 per side, smooth out of the bottom with no bounce.",
        target: reps(3, 5),
        weeks: "4–8 weeks",
      },
      {
        name: "Assisted Dragon Squat",
        how: "Hold a post. Swing the free leg behind the standing leg and slide it out long past the standing side as you sit, chest well forward, standing heel down. Use the hands less each week. 3 × 3–5 per side.",
        when: "3 × 5 per side with fingertip help, the standing knee tracking over the toes.",
        target: reps(3, 5),
        weeks: "4–8 weeks",
      },
      {
        name: "Dragon Squat",
        aka: ["Dragon Pistol Squat", "Dragon Pistol"],
        how: "Hands free: thread the leg behind, let the chest come down over the standing knee and reach both arms forward to balance, hips down by the standing heel. 3 × 1–5 per side.",
      },
    ],
  },
  {
    id: "figure-4-squat",
    goal: "Figure-4 Squat",
    family: "bodyweight",
    blurb:
      "A single-leg squat with the other ankle crossed over the standing knee, so one leg gets stronger while the crossed hip stretches. Works as a warm-up as well as a strength drill.",
    steps: [
      {
        name: "Pigeon Stretch",
        how: "Front shin across the body, back leg long, hips square, fold forward over the front shin. 2–3 × 30–60s per side.",
        when: "The chest rests over the front shin for 60s with the hips level.",
        weeks: "2–4 weeks",
      },
      {
        name: "Box Figure-4 Squat",
        how: "On one leg with the other ankle crossed just above that knee, sit back to a box and stand up without rocking. Lower the box over the weeks. 3 × 5–8 per side.",
        when: "3 × 8 per side to a box at knee height or lower.",
        target: reps(3, 8),
        weeks: "3–6 weeks",
      },
      {
        name: "Figure-4 Squat",
        aka: ["Figure-4 Single-Leg Squat", "Figure Four Squat", "Crossed-Leg Squat"],
        how: "No box. Ankle above the knee, not on it, crossed knee falling open; sit the hips back and down until the crossed shin is level, chest up, arms forward. 3 × 5–8 per side. Pause at the bottom or take 3–4s down to make it harder.",
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
      "Balance on your hands away from the wall. The wall drills move one thing at a time — the shoulders, one leg, then both feet — so the hands learn to steer. Practice little and often: balance is a skill, not a strength.",
    steps: [
      {
        name: "Plank",
        how: "On the hands, ribs down, glutes squeezed. 3 × 30–60s.",
        when: "3 × 60s without the hips sagging.",
        target: hold(3, 60),
        weeks: "1–3 weeks",
      },
      {
        name: "Box Pike Shoulder Stack",
        aka: ["Elevated Pike Shoulder Stack", "Box Pike Stack"],
        how: "Feet on a box or bench, hands on the floor, hips up in a pike. Push the floor away and lean the shoulders toward the box until hands, shoulders and hips make one straight line, then ease back. The feet stay on the box. 4 × 10.",
        when: "4 × 10 reaching a straight line from hands to hips every rep.",
        target: reps(4, 10),
        weeks: "2–4 weeks",
      },
      {
        name: "Handstand Hold",
        how: "Chest to the wall, hands a palm's width away, body straight. 3 × 30–60s.",
        when: "3 × 60s chest-to-wall in a straight line.",
        target: hold(3, 60),
        weeks: "3–6 weeks",
      },
      {
        name: "Wall Handstand Single-Leg Pull",
        aka: ["Chest-to-Wall Single-Leg Pull", "Single-Leg Toe Pull"],
        how: "Chest to the wall. Peel one foot off the wall toward your back, hold it there a moment while the hands keep the balance, then touch it back. Alternate legs. 4 × 6.",
        when: "4 × 6 holding the free foot off for 2s each time.",
        target: reps(4, 6),
        weeks: "2–4 weeks",
      },
      {
        name: "Wall Handstand Shoulder Stack",
        aka: ["Chest-to-Wall Shoulder Stack", "Wall Handstand Shoulder Opener"],
        how: "Chest to the wall, hands about a forearm's length out. Let the shoulders sink back past the hands so the body leans into the wall in one line, then push tall through the shoulders until the trunk stands straight over the hands, toes still on the wall. 4 × 6.",
        when: "4 × 6 finishing every rep with the shoulders over the wrists.",
        target: reps(4, 6),
        weeks: "3–6 weeks",
      },
      {
        name: "Wall L-Handstand Leg Sweep",
        aka: ["Single-Leg Wall L-Handstand", "Wall L-Handstand Leg Lift"],
        how: "Hands about a leg's length from the wall, chest toward it. Walk one foot onto the wall at hip height so that leg is level, raise the other straight up, then sweep it toward the wall and back past vertical while the hands hold the balance. 4 × 6 per leg.",
        when: "4 × 6 per leg without the wall foot sliding.",
        target: reps(4, 6),
        weeks: "3–6 weeks",
      },
      {
        name: "Chest-to-Wall Toe Pull",
        aka: ["Wall Handstand Toe Pull", "Handstand Toe Pull", "Toe Pulls"],
        how: "Chest to the wall, hands close. Press into the fingertips so the shoulders shift a touch toward the wall and both feet float off it; hold the balance, then touch back. 4 × 6, each 2–5s off the wall.",
        when: "4 × 6 with 5s off the wall each time.",
        target: reps(4, 6),
        weeks: "3–6 weeks",
      },
      {
        name: "Freestanding Handstand",
        how: "Kick up in open space, balance through the fingers, bail with a cartwheel. 10 min of attempts; note your best hold.",
      },
    ],
  },
  {
    id: "tuck-press",
    goal: "Tuck Press to Handstand",
    family: "bodyweight",
    blurb:
      "Pressing up to a handstand from a crouch. It is built on the planche's forward lean: get strong leaning past your hands, then move the legs while the shoulders stay put. The top is a handstand, so work the Freestanding Handstand path alongside.",
    steps: [
      {
        name: "Push-Up",
        how: "Full range, chest to the floor. 3 × 10–20.",
        when: "3 × 15 push-ups.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Planche Lean",
        aka: ["Planche Lean Hold"],
        how: "Plank on straight arms, fingers forward or turned out. Rock the shoulders forward past the hands until the toes roll onto their tips; arms locked, shoulder blades pushed apart. 3–5 × 10–30s.",
        when: "3 × 30s with the shoulders a hand's length past the wrists.",
        target: hold(3, 30),
        weeks: "2–4 weeks",
      },
      {
        name: "Pseudo Planche Push-Up",
        aka: ["Planche Lean Push-Up", "PPPU"],
        how: "From the planche lean, lower the chest to the floor without letting the shoulders drift back over the hands, so at the bottom the hands are by the waist and the elbows point at the feet. Press back up to the lean. 3 × 5–12.",
        when: "3 × 12 holding the lean the whole way.",
        target: reps(3, 12),
        weeks: "4–8 weeks",
      },
      {
        name: "Tuck Planche",
        aka: ["Tuck Planche Hold"],
        how: "Squat on the toes with the hands planted, knees against the backs of the arms. Lean forward until the feet float, then pull the knees in off the arms: arms locked, back rounded, hips about level with the shoulders. Test it by kicking the legs back to a plank without the shoulders moving. 5–8 × 5–15s.",
        when: "5 × 10s with straight arms and the knees off the arms.",
        target: hold(5, 10),
        weeks: "6–12 weeks",
      },
      {
        name: "Tuck Planche Push-Up",
        how: "From the tuck planche, bend the arms and lower the head and shoulders toward the floor, hips high and knees off the arms, then press back to straight arms. 3–5 × 3–8.",
        when: "3 × 8 lowering until the head is near the floor.",
        target: reps(3, 8),
        weeks: "6–12 weeks",
      },
      {
        name: "Tuck Press Negative",
        aka: ["Tuck Press Lowering"],
        how: "Kick up to a handstand (by a wall at first), pull the knees to the chest and lower slowly through the tuck into the tuck planche and down to the crouch, hands staying put. 3–5 × 1–3, each 5s or longer.",
        when: "3 × 3 that each take 5s, landing softly in the crouch.",
        target: reps(3, 3),
        weeks: "4–8 weeks",
      },
      {
        name: "Tuck Press to Handstand",
        aka: ["Tuck Press", "Tuck Handstand Press"],
        how: "From the crouch with the hands down, lean into the tuck planche, then let the hips rise over the hands as the shoulders come back above them, knees tight to the chest. Once the hips are stacked, open to a tuck handstand and straighten the legs. Lower the same way. 3–5 × 1–3.",
      },
    ],
  },
  {
    id: "planche",
    goal: "Full Planche",
    family: "bodyweight",
    blurb:
      "Holding the body level over straight arms, feet off the floor. Every step asks the shoulders to sit further past the hands as the legs reach further back. Straight-arm work loads the elbows and wrists hard: build each hold over weeks, not sessions.",
    steps: [
      {
        name: "Planche Lean",
        aka: ["Planche Lean Hold"],
        how: "Plank on straight arms, fingers forward or turned out. Rock the shoulders forward past the hands until the toes roll onto their tips; arms locked, shoulder blades pushed apart. 3–5 × 10–30s.",
        when: "3 × 30s with the shoulders a hand's length past the wrists.",
        target: hold(3, 30),
        weeks: "2–4 weeks",
      },
      {
        name: "Pseudo Planche Push-Up",
        aka: ["Planche Lean Push-Up", "PPPU"],
        how: "From the planche lean, lower the chest to the floor without letting the shoulders drift back over the hands, then press back to the lean. 3 × 5–12.",
        when: "3 × 12 holding the lean the whole way.",
        target: reps(3, 12),
        weeks: "4–8 weeks",
      },
      {
        name: "Tuck Planche",
        aka: ["Tuck Planche Hold"],
        how: "Hands planted, lean until the feet float and pull the knees in off the arms: arms locked, back rounded, hips about level with the shoulders. 5–8 × 5–15s.",
        when: "5 × 15s with straight arms and the knees off the arms.",
        target: hold(5, 15),
        weeks: "6–12 weeks",
      },
      {
        name: "Advanced Tuck Planche",
        aka: ["Advanced Tuck Planche Hold", "Adv Tuck Planche"],
        how: "The tuck with the back flattened: hips up level with the shoulders, thighs hanging under the hips, shins pointing back. Lean further than in the tuck to balance it. 5–8 × 5–12s.",
        when: "5 × 12s with a flat back and locked arms.",
        target: hold(5, 12),
        weeks: "8–16 weeks",
      },
      {
        name: "Straddle Planche",
        aka: ["Straddle Planche Hold"],
        how: "From the advanced tuck, open the legs straight and wide to the sides, glutes tight, toes pointed; the wider the straddle, the shorter the lever. Start with the legs partly bent and straighten over the weeks. 5–8 × 3–10s.",
        when: "5 × 10s with straight legs and the hips level with the shoulders.",
        target: hold(5, 10),
        weeks: "12–24 weeks",
      },
      {
        name: "Full Planche",
        aka: ["Planche", "Full Planche Hold"],
        how: "Legs straight and together, body in one line from heels to shoulders, level with the floor, shoulders well past the hands and arms locked. 5–8 × 2–8s.",
      },
    ],
  },
  {
    id: "prayer-planche",
    goal: "Prayer Planche",
    family: "bodyweight",
    blurb:
      "A bent-arm planche on the forearms: shoulders turned in so the backs of the hands touch, fingers pointing back at the feet, body level over the forearms. It needs a lot of shoulder internal rotation and can pinch the shoulders while you learn it, so build the lean slowly and stop at pain. Planche work builds the front-delt strength it needs; it carries little back to the straight-arm planche.",
    steps: [
      {
        name: "Planche Lean",
        aka: ["Planche Lean Hold"],
        how: "Plank on straight arms, rock the shoulders forward past the hands until the toes roll onto their tips. 3–5 × 10–30s.",
        when: "3 × 30s with the shoulders a hand's length past the wrists.",
        target: hold(3, 30),
        weeks: "2–4 weeks",
      },
      {
        name: "Tuck Planche",
        aka: ["Tuck Planche Hold"],
        how: "Hands planted, lean until the feet float and pull the knees in off the arms. 5–8 × 5–15s.",
        when: "5 × 10s with straight arms and the knees off the arms.",
        target: hold(5, 10),
        weeks: "6–12 weeks",
      },
      {
        name: "Prayer Planche Lean",
        aka: ["Prayer Lean"],
        how: "Kneel, turn the arms in so the backs of the hands touch and the fingers point back at the knees, and lay the forearms flat under the belly. Walk the feet back to a plank on the toes and lean forward so the shoulders move past the elbows. 3–5 × 10–20s, easing into the shoulder rotation.",
        when: "3 × 20s with the shoulders well past the elbows and no shoulder pain.",
        target: hold(3, 20),
        weeks: "3–6 weeks",
      },
      {
        name: "Tuck Prayer Planche",
        aka: ["Tuck Prayer Planche Hold"],
        how: "From the prayer lean, pull the knees in under the hips and lean until the feet float, balancing on the forearms. 5–8 × 5–10s.",
        when: "5 × 10s with the feet off and the hips level with the shoulders.",
        target: hold(5, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Prayer Planche",
        aka: ["Prayer Planche Hold", "Full Prayer Planche"],
        how: "From the tuck, extend the legs straight back (straddled wide at first) until the body is level from shoulders to heels, balanced over the forearms. 5–8 × 3–8s.",
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
    id: "korean-dip",
    goal: "Korean Dip",
    family: "bodyweight",
    blurb:
      "The straight-bar dip with the bar behind you. It loads the shoulders deep in extension, so it starts by holding rear support and lowering before pressing.",
    steps: [
      {
        name: "Straight-Bar Dip",
        how: "Support on top of a straight bar, lean over it, lower the chest to the bar and press out. 3 × 5–10.",
        when: "3 × 10 with the chest touching the bar.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Rear Support Hold",
        aka: ["Korean Dip Support Hold", "Straight-Bar Rear Support"],
        how: "Stand in front of a bar at hip height, reach back and grip it beside your hips, then lift onto straight arms with the bar behind you: chest up, shoulders pushed down. 3 × 15–30s.",
        when: "3 × 30s on locked arms without the shoulders rolling forward.",
        target: hold(3, 30),
        weeks: "2–4 weeks",
      },
      {
        name: "Korean Dip Negative",
        aka: ["Negative Korean Dip"],
        how: "From rear support, bend the elbows back and lower until the bar reaches your lower back, taking 4–5s. Step back up to the top. 3 × 3–5.",
        when: "3 × 5 slow lowerings with the bar staying on your back.",
        target: reps(3, 5),
        weeks: "2–4 weeks",
      },
      {
        name: "Korean Dip",
        aka: ["Korean Dips", "Rear Support Dip"],
        how: "From rear support, lower until the bar reaches your lower back, chest pitched forward, then press back to straight arms. 3 × 3–8.",
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

  {
    id: "human-flag",
    goal: "Human Flag",
    family: "bodyweight",
    blurb:
      "The body held level out from a pole: the top arm pulls, the bottom arm pushes with the elbow locked, and the side of the trunk holds it all straight. Train both sides.",
    steps: [
      {
        name: "Side Plank",
        how: "Elbow under the shoulder, hips high, body one straight line. 3 × 30–60s per side.",
        when: "3 × 60s per side without the hips dropping.",
        target: hold(3, 60),
        weeks: "2–4 weeks",
      },
      {
        name: "Vertical Flag",
        aka: ["Vertical Flag Hold"],
        how: "Top hand high on the pole, bottom hand about shoulder width below it, bottom arm locked. Kick up until the body is straight up above the bottom hand, like a handstand held against the pole. 3–5 × 10–20s per side.",
        when: "3 × 20s per side with the bottom arm locked and the legs together.",
        target: hold(3, 20),
        weeks: "3–6 weeks",
      },
      {
        name: "Tuck Flag",
        aka: ["Tuck Human Flag"],
        how: "Same grip, knees pulled to the chest. Push the bottom shoulder away from the pole and pull with the top arm until the hips are level with the hands. 4–6 × 5–10s per side.",
        when: "4 × 10s per side with the hips level.",
        target: hold(4, 10),
        weeks: "4–8 weeks",
      },
      {
        name: "Human Flag Negative",
        aka: ["Flag Negative"],
        how: "Kick up to the vertical flag, then lower a straight body toward level as slowly as you can and step down. 3–5 per side, each 5s or longer.",
        when: "3 × 3 per side that each take a full 5s to reach level.",
        target: reps(3, 3),
        weeks: "4–8 weeks",
      },
      {
        name: "Straddle Flag",
        aka: ["Straddle Human Flag"],
        how: "Legs wide to shorten the lever, body level from the shoulders, bottom arm locked. Bring the legs closer together over the weeks. 4–6 × 3–8s per side.",
        when: "4 × 8s per side with the body level.",
        target: hold(4, 8),
        weeks: "6–12 weeks",
      },
      {
        name: "Human Flag",
        aka: ["Full Human Flag", "Full Flag"],
        how: "Legs together, body level and straight from the shoulders to the feet. 3–5 × 3–10s per side, starting with the weaker side.",
      },
    ],
  },

  {
    id: "one-arm-pullover",
    goal: "One-Arm Pullover",
    family: "bodyweight",
    blurb:
      "From a hang to a support on top of the bar by rolling backwards over it: the legs go up and over, the hips meet the bar, and the body pivots on them until it is upright. One arm makes it a pulling and core skill at once. Train both sides.",
    steps: [
      {
        name: "Hanging Knee Raise",
        how: "Dead hang, knees to the chest, then curl the hips up so the pelvis tips toward the bar. That curl is what a pullover starts with. 3 × 10–15.",
        when: "3 × 15 without swinging, hips curling at the top.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Toes-to-Bar",
        how: "Straight legs all the way to the bar, controlled, no kip. 3 × 5–8.",
        when: "3 × 8 strict.",
        target: reps(3, 8),
        weeks: "4–8 weeks",
      },
      {
        name: "Bar Pullover",
        aka: ["Pullover", "Hip Pullover"],
        how: "Two hands, from a dead hang. Pull the bar toward the waist while the legs go up and over it, keep the hips close, and roll on them to a straight-arm support. No kick. 3 × 3–6.",
        when: "3 × 6 strict, without a swing to start them.",
        target: reps(3, 6),
        weeks: "3–6 weeks",
      },
      {
        name: "One-Arm Hang",
        how: "One arm on the bar, shoulder pulled down and in, the body still. 3 × 10–20s per side.",
        when: "3 × 20s per side without the shoulder creeping to the ear.",
        target: hold(3, 20),
        weeks: "3–6 weeks",
      },
      {
        name: "Assisted One-Arm Pull-Up",
        how: "One hand on the bar, the other on a band or towel lower down doing as little as it can. 3 × 3–5 per side.",
        when: "3 × 5 per side with the helping hand only lightly loaded.",
        target: reps(3, 5),
        weeks: "6–12 weeks",
      },
      {
        name: "One-Arm Pullover Negative",
        aka: ["Negative One-Arm Pullover"],
        how: "Get into a one-arm support on top of the bar (step up, or pullover with two hands and let one go), then roll backwards off it as slowly as you can: hips on the bar, legs over, down through the tuck to a hang. 3 × 2–3 per side, 5s each.",
        when: "3 × 3 per side, controlled all the way to the hang.",
        target: reps(3, 3),
        weeks: "3–6 weeks",
      },
      {
        name: "One-Arm Pullover",
        aka: ["One-Arm Bar Pullover", "Single-Arm Pullover"],
        how: "One-arm hang, free arm loose. Pull and tuck at once, roll back until the hips reach the bar with the legs over it, then pivot on the hips and press to a support. Singles per side, weaker side first.",
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
        name: "Seated Leg Lift",
        aka: ["Seated Straight-Leg Raise"],
        how: "Sit tall, hands flat beside the hips, one knee bent. Lift the straight leg as high as it goes without leaning back, then lower slowly. 3 × 8–12 per leg.",
        when: "3 × 12 per leg with the heel clearing knee height.",
        target: reps(3, 12),
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
        name: "Wall One-Leg V-Sit",
        how: "Upper back on a wall, hands on the floor beside the hips, hips just off the floor. One leg straight and as high as it goes, the other tucked. 3 × 10–15s per leg.",
        when: "3 × 15s per leg with the straight leg near vertical.",
        target: hold(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Wall V-Sit",
        how: "Same set-up against the wall with both legs straight and together, pulled up towards the chest. 3 × 10–15s.",
        when: "3 × 15s with locked knees and the hips off the floor.",
        target: hold(3, 15),
        weeks: "3–6 weeks",
      },
      {
        name: "Banded V-Sit",
        aka: ["Band-Assisted V-Sit"],
        how: "Off the wall. Loop a light band round the feet and behind the upper back; it holds the legs up while you push the floor away. Start with one leg, then both. 3 × 10–15s.",
        when: "3 × 15s with the lightest band.",
        target: hold(3, 15),
        weeks: "3–6 weeks",
      },
      {
        name: "V-Sit",
        how: "Hands pushing the floor or parallettes away, shoulders leaning back, straight legs lifted above the hips. 3 × 5–10s.",
      },
    ],
  },
  {
    id: "l-sit-press",
    goal: "L-Sit Press to Handstand",
    family: "bodyweight",
    blurb:
      "From sitting in an L-sit to standing on your hands without a kick. Three parts carry it: compression to fold the legs in, shoulders that lean on to let the legs pass, and shoulders that keep pushing as the hips go over. Train each on its own, then put them together. Work the L-Sit and Freestanding Handstand paths alongside.",
    steps: [
      {
        name: "L-Sit",
        how: "Hands beside the hips, arms locked, legs straight out at hip height. 3 × 10–20s.",
        when: "3 × 20s with straight knees.",
        target: hold(3, 20),
        weeks: "4–8 weeks",
      },
      {
        name: "Block Pike Compression Lean",
        aka: ["Heels-Elevated Compression Lean", "Elevated Pike Compression"],
        how: "Heels up on two or three stacked blocks, hands flat just in front of the hips, hips off the floor. Lean the shoulders past the wrists and pull the chest down to the thighs, round back, then ease off. 3 × 6–10 slow reps.",
        when: "3 × 10 with the chest touching the thighs and straight arms.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Chair Press Leg Pass",
        aka: ["Chair-Assisted Press Leg Pass", "Chair Leg Pass-Through"],
        how: "Hands on the floor, one foot up on a chair behind you, shoulders over the hands. Lean on and bring the free leg down and through past the hands, then back up. If it won't pass yet, just reach the knee to the arms. 3 × 5 per leg.",
        when: "3 × 5 per leg with the toes landing past the hands.",
        target: reps(3, 5),
        weeks: "3–6 weeks",
      },
      {
        name: "Wall Pike Press Lean",
        aka: ["Wall Pike Shoulder Push", "Back-to-Wall Pike Lean"],
        how: "Seat and heels against a wall, fold forward with hands flat on the floor. Push the floor away and lean the shoulders over the hands until the heels go light, hold, return. 3 × 5 × 5s.",
        when: "3 × 5 holds of 5s with the heels off the floor.",
        target: reps(3, 5),
        weeks: "3–6 weeks",
      },
      {
        name: "L-Sit Press to Handstand",
        aka: ["L-Sit to Handstand Press", "Pike Press to Handstand"],
        how: "From an L-sit, lean on, swing the hips back and up through the arms, keep pushing as the hips pass over the shoulders, then open into a handstand. 3 × 1–3.",
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
      "Resisting a back that wants to arch, from a plank to rolling out from your feet. Each rung makes the lever longer or the range bigger, never both at once.",
    steps: [
      {
        name: "Plank",
        how: "Forearms down, ribs down, glutes tight. 3 × 30–60s.",
        when: "3 × 60s without the hips sagging.",
        target: hold(3, 60),
        weeks: "1–3 weeks",
      },
      {
        name: "Stability Ball Rollout",
        aka: ["Swiss Ball Rollout", "Ball Rollout", "Exercise Ball Rollout"],
        how: "Kneeling, forearms on a big ball, hips tucked. Roll the ball out on the forearms until the body is one line from the knees, then pull it back with the abs, not the hips. 3 × 8–12.",
        when: "3 × 12 with the forearms reaching overhead and no arch.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Wall-Stop Ab Wheel Rollout",
        aka: ["Partial Ab Wheel Rollout", "Kneeling Wall-Stop Rollout"],
        how: "From the knees, facing a wall about an arm's length beyond your head. Roll out until the wheel touches the wall, then back. Move the wall a few centimetres further each week. 3 × 8–12.",
        when: "3 × 12 with the wall far enough away that the chest is a hand's width off the floor.",
        target: reps(3, 12),
        weeks: "3–6 weeks",
      },
      {
        name: "Ab Wheel Rollout",
        aka: ["Kneeling Ab Wheel Rollout", "Ab Rollout", "Ab Roller", "Ab Rollers"],
        how: "From the knees, hips tucked and ribs down. Roll out until the body is straight and the chest nearly touches the floor, then pull back without the hips leading. 3 × 8–15.",
        when: "3 × 15 to full extension. High-rep sets (the 2 × 25 of a rugby core circuit) are a conditioning goal on this rung, not a reason to move up.",
        target: reps(3, 15),
        weeks: "4–8 weeks",
      },
      {
        name: "Standing Wall-Stop Ab Wheel Rollout",
        aka: ["Standing Ab Wheel Rollout to Wall", "Standing Wall-Stop Rollout"],
        how: "From the feet, legs straight, facing a wall. Roll into the wall and back. Start with the wall close, so it's half a rollout, and move it back over the weeks. 3 × 5–8.",
        when: "3 × 8 with the wall far enough back that the hips are level with the shoulders at the stop.",
        target: reps(3, 8),
        weeks: "4–8 weeks",
      },
      {
        name: "Standing Ab Wheel Negative",
        aka: ["Ab Wheel Negative", "Standing Rollout Negative"],
        how: "From the feet, roll out as slowly as you can, 4–5 seconds, until the body is near the floor. Drop to the knees and roll back in from there. 3 × 3–5.",
        when: "3 × 5 slow negatives that reach the floor without the lower back sagging.",
        target: reps(3, 5),
        weeks: "4–8 weeks",
      },
      {
        name: "Standing Ab Wheel Rollout",
        how: "From the feet, all the way out and all the way back, legs straight, no arch. 3 × 3–6.",
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
    id: "prone-y-raise",
    goal: "Weighted Prone Y Raise",
    family: "strength",
    blurb:
      "Lower-trap strength and shoulder-blade control for pressing and lifting overhead. Start with an arm lift from child's pose, then a Y on the floor, then off a bench, then a Y holding small plates.",
    steps: [
      {
        name: "Child's Pose Lift-Off",
        aka: ["Childs Pose Lift-Off", "Child's Pose Lift Off", "Child's Pose Arm Lift", "Backward-Rocking Arm Lift"],
        how: "Sit back on your heels with your arms long on the floor in a Y. Lift one straight arm off the floor, thumb up, and hold 2–3s, then lower it. Keep your hips on your heels and your neck relaxed. 2–3 × 8–10 per side.",
        when: "3 × 10 per side, each arm lifting to in line with your ears, both sides the same height.",
        target: reps(3, 10),
        weeks: "1–3 weeks",
      },
      {
        name: "Prone Y Raise",
        aka: ["Prone Y", "Pronated Y Raise", "Floor Y Raise", "Lying Y Raise"],
        how: "Lie face down on the floor, forehead on a folded towel, arms in a Y with the thumbs up. Set your shoulder blades down and back, then lift both arms a few inches and hold 2s. Don't shrug and don't arch your lower back. 3 × 10–12.",
        when: "3 × 12 with a 2s hold, and your shoulders stay away from your ears.",
        target: reps(3, 12),
        weeks: "2–3 weeks",
      },
      {
        name: "Bench Prone Y Raise",
        aka: ["Prone Y Raise on Bench", "Bench Y Raise"],
        how: "Lie chest-down on a flat bench with your head and shoulders past the end and your arms hanging. Raise straight arms forward and out into a Y, thumbs up, until they're in line with your ears. Hold 2s at the top and lower over 2–3s. 3 × 10–12.",
        when: "3 × 12 reaching ear height with a 2s hold.",
        target: reps(3, 12),
        weeks: "2–4 weeks",
      },
      {
        name: "Weighted Prone Y Raise",
        aka: ["Weighted Bench Y Raise", "Weighted Pronated Y Raise", "Prone Y Raise with Plates", "Dumbbell Prone Y Raise"],
        how: "Same as the bench version, holding a small plate or dumbbell in each hand. Start at 0.5–1.5 kg: the arms are a long lever, so a little weight goes a long way. Add weight only when every rep still reaches ear height with the 2s hold. 3 × 8–12.",
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
    id: "butterfly",
    goal: "Feet-Elevated Kettlebell Butterfly Stretch",
    family: "mobility",
    blurb:
      "Adductor and hip length for the knees to fall open with the soles together. Raise the heels for more range, then let kettlebells do the pressing.",
    steps: [
      {
        name: "Butterfly Stretch",
        aka: ["Seated Butterfly Stretch", "Bound Angle Pose"],
        how: "Soles together, heels as close in as is comfortable, sit tall and let the knees fall out. 2 × 60s.",
        when: "2 × 60s sitting tall with the knees relaxed, not held up.",
        target: hold(2, 60),
        weeks: "2–3 weeks",
      },
      {
        name: "Feet-Elevated Butterfly Stretch",
        how: "Same position with the heels up on a yoga block, so the knees have further to drop below the feet. 2 × 60s.",
        when: "2 × 60s with the knees at or below the height of the block.",
        target: hold(2, 60),
        weeks: "2–4 weeks",
      },
      {
        name: "Kettlebell Butterfly Stretch",
        aka: ["Loaded Butterfly Stretch", "Weighted Butterfly Stretch"],
        how: "Back on the floor, rest a kettlebell on each thigh just inside the knee and let it press the knees down. Start light (4–8 kg). 2–3 × 60–90s, breathing slowly.",
        when: "3 × 90s with no pinching at the front of the hip or the knee.",
        target: hold(3, 90),
        weeks: "3–6 weeks",
      },
      {
        name: "Feet-Elevated Kettlebell Butterfly Stretch",
        aka: ["Elevated Kettlebell Butterfly Stretch"],
        how: "Heels on the block and a kettlebell on each thigh. 2–3 × 60–90s. Go heavier only while the knees and hips stay comfortable.",
      },
    ],
  },
  {
    id: "end-range-quads",
    goal: "Seated Straddle Leg Lifts over Blocks",
    family: "mobility",
    blurb:
      "Strength at the very end of the range: locking the knee and lifting the leg while the hamstrings are long. Passive length comes first, then owning it under load.",
    steps: [
      {
        name: "Seated Forward Fold",
        how: "Legs straight, hinge from the hips with a long back. 3 × 30–60s.",
        when: "Hands reach the toes with a flat back and straight knees.",
        weeks: "2–4 weeks",
      },
      {
        name: "Piked TKE",
        aka: ["Piked Terminal Knee Extension", "Pike TKE"],
        how: "Band behind one knee, anchored low in front. Fold into a flat-backed pike, let the band draw the knee into a slight bend, then lock it out hard and hold 2s without coming up. 3 × 10–15 per side.",
        when: "3 × 15 per side with a full lockout every rep and the fold held.",
        target: reps(3, 15),
        weeks: "2–4 weeks",
      },
      {
        name: "Banded SAQ in Pike",
        aka: ["Banded Short Arc Quad in Pike", "Pike SAQ"],
        how: "Sit in a pike leaning forward, a rolled towel or small roller under one knee and a light band from that ankle to a weight ahead. Straighten the knee until the heel lifts, hold 2s, lower slowly. 3 × 10–15 per side.",
        when: "3 × 15 per side with the heel lifting and the knee locking while the chest stays forward.",
        target: reps(3, 15),
        weeks: "3–6 weeks",
      },
      {
        name: "Seated Straddle Leg Lifts over Blocks",
        aka: ["Seated Straddle Leg Lifts", "Straddle Leg Lifts over Blocks"],
        how: "Sit tall in a wide straddle with a yoga block outside each ankle. Knee locked and toes up, lift one leg up and over its block and back. Hands on the floor behind you at first, then beside the hips. 3 × 6–10 per side; move the blocks further out or use taller ones to progress.",
      },
    ],
  },
  {
    id: "cossack-squat",
    goal: "Kettlebell Cossack Sit-Through",
    family: "mobility",
    blurb:
      "Adductor and hip range side to side, then owning it. Build depth with support, keep it without, load it, and only then go deeper into the floor and back.",
    steps: [
      {
        name: "Ring-Assisted Cossack Squat",
        aka: ["Assisted Cossack Squat", "TRX Cossack Squat"],
        how: "Hold rings or straps overhead and sink into one side, the other leg straight with the toes up. Let the arms take as much weight as you need to get deep with the heel down. 3 × 5–8 per side.",
        when: "3 × 8 per side reaching full depth, heel flat, while barely pulling on the rings.",
        target: reps(3, 8),
        weeks: "2–4 weeks",
      },
      {
        name: "Assisted Cossack Transition",
        aka: ["Assisted Cossack Transitions", "Supported Cossack Shift"],
        how: "Hold a rack, post or bar in front and shift low from one side to the other without standing up in between. Slow, 3–4s across. 3 × 6–10 shifts.",
        when: "3 × 10 shifts staying low the whole way, the hands only steadying.",
        target: reps(3, 10),
        weeks: "2–4 weeks",
      },
      {
        name: "Cossack Squat",
        aka: ["Bodyweight Cossack Squat", "Cossack Squats"],
        how: "No support: fingertips may brush the floor in front. Shift side to side through the bottom, chest over the bent knee, straight leg locked with the toes up. 3 × 6–10 per side.",
        when: "3 × 10 per side at full depth without the hands taking weight.",
        target: reps(3, 10),
        weeks: "3–6 weeks",
      },
      {
        name: "Kettlebell Goblet Cossack Squat",
        aka: ["Goblet Cossack Squat", "Kettlebell Cossack Squat"],
        how: "Hold a kettlebell by the horns at the chest; sit into one side, stand through the middle, sit into the other. The bell is a counterweight, so many find the bottom easier. 3 × 5–8 per side, adding weight slowly.",
        when: "3 × 8 per side with about a quarter of your bodyweight and the same depth as unloaded.",
        weeks: "4–8 weeks",
      },
      {
        name: "Kettlebell Cossack Sit-Through",
        aka: ["Cossack Squat Sit-Through", "Cossack Sit-Through"],
        how: "Goblet bell at the chest. From the bottom of one side, lower all the way to sit on the floor, then rise out of it into the bottom of the other side. Control both directions; no bouncing off the floor. 3 × 3–5 per side.",
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
  // Both also start the one-arm pullover path, which comes earlier in the
  // list; the toes-to-bar ladder is the nearer next step.
  "hanging knee raise": "toes-to-bar",
  "toes-to-bar": "toes-to-bar",
  plank: "ab-wheel",
  "air squat": "pistol-squat",
  "single-leg glute bridge": "hip-thrust",
  "seated forward fold": "pancake",
  // Side Plank also starts the human flag path; the Copenhagen plank is the
  // nearer next step for most people.
  "side plank": "copenhagen",
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
