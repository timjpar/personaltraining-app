// Climbing-specific training, grouped the way a climber actually plans a week
// rather than by equipment like the general catalog. Only exercise-presets.ts
// reads this, and it uses these groups twice: as seven first-class categories
// in the catalog /exercises browses, and flattened into one "Rock Climbing"
// entry in the picker a coach scrolls every session.
//
// No imports on purpose. exercise-presets.ts imports *this*, so anything
// imported back the other way would be a cycle.
//
// The notes are prescriptions, not descriptions. A name alone ("Repeaters")
// tells a coach nothing they didn't know and a client nothing at all; the
// protocol is the part worth shipping. Numbers are the conventional starting
// points — a trainer overrides them per athlete in the workout itself.

export type ClimbingExercise = {
  name: string;
  note: string;
};

export type ClimbingGroup = {
  label: string;
  blurb: string;
  exercises: ClimbingExercise[];
};

export const CLIMBING_GROUPS: ClimbingGroup[] = [
  {
    label: "Fingers & Grip",
    blurb:
      "The slowest tissue to adapt and the fastest to injure. Always fully warmed up, never on consecutive days, and stopped while the last rep still looks like the first.",
    exercises: [
      {
        name: "Dead Hang",
        note: "Two hands on a jug or 20mm edge. 3 × 10–30s, shoulders engaged, elbows soft.",
      },
      {
        name: "Hangboard Max Hangs",
        note: "10s at a load you could hold ~13s. 4–5 sets, 3 min rest. Strength, not fatigue.",
      },
      {
        name: "Hangboard Repeaters",
        note: "7s on / 3s off × 6 = one set. 4–6 sets, 3 min rest. Use an edge you can hold 10s.",
      },
      {
        name: "Half-Crimp Hang",
        note: "Fingers at 90°, thumb off. The position that transfers — train it before open hand feels easy.",
      },
      {
        name: "Open-Hand Hang",
        note: "Four fingers draped, no thumb wrap. Kinder on the pulleys; slower to build.",
      },
      {
        name: "Three-Finger Drag",
        note: "Index, middle, ring. 3 × 10s per hand. Builds the grip most pockets actually ask for.",
      },
      {
        name: "Two-Finger Pocket Hang",
        note: "Middle two only, assisted. 5–7s. Advanced — years of climbing before this, not months.",
      },
      {
        name: "Pinch Block Lift",
        note: "5 × 8s per hand, adding weight weekly. Thumb strength no hangboard trains.",
      },
      {
        name: "One-Arm Assisted Hang",
        note: "Pulley or foot on a chair to remove 20–40%. 3 × 8s per side.",
      },
      {
        name: "Wrist Roller",
        note: "3 × up-and-down. Forearm work that balances all the closing.",
      },
      {
        name: "Rice Bucket Dig",
        note: "2 × 60s of grabbing, spreading, twisting. Recovery, not training — after sessions.",
      },
    ],
  },
  {
    label: "Pulling Power",
    blurb:
      "Everything above the elbow. This is where added strength shows up fastest on steep terrain.",
    exercises: [
      {
        name: "Weighted Pull-Up",
        note: "5 × 3–5 at a weight that makes the last rep slow. The base for everything below.",
      },
      {
        name: "Offset Pull-Up",
        note: "One hand high, one on a towel or lower rung. 3 × 4 per side. The bridge to one-arm work.",
      },
      {
        name: "Typewriter Pull-Up",
        note: "Pull up, travel side to side at the top. 3 × 3 lengths. Lock-off strength through range.",
      },
      {
        name: "Lock-Off Hold",
        note: "Hold at 90° and again at 120°. 3 × 8s per angle, per arm.",
      },
      {
        name: "Frenchies",
        note: "Pull up, hold 5s at top / 90° / 120°, repeat. 3 sets. One of the best value drills there is.",
      },
      {
        name: "Assisted One-Arm Pull-Up",
        note: "Band or two fingers on the other hand. 4 × 2 per side.",
      },
      {
        name: "Campus Board Ladder",
        note: "1-3-5 up, match, down-climb. 4–6 ladders. Fully warm, well rested, never when tired.",
      },
      {
        name: "Campus Board Bumps",
        note: "1-2-3-4 without matching. Contact strength. Advanced athletes only.",
      },
      {
        name: "Scapular Pull-Up",
        note: "3 × 10. Hang, then pull the shoulders down without bending the arms. Do these first.",
      },
      {
        name: "Ring Row",
        note: "3 × 12, feet forward to make it harder. The horizontal pull climbers skip.",
      },
    ],
  },
  {
    label: "Core & Body Tension",
    blurb:
      "What keeps your feet on the wall when it steepens. Tension is why a move feels impossible on a 45° board and fine on a slab.",
    exercises: [
      {
        name: "Front Lever Tuck",
        note: "3 × 10s. Hollow, hips level with shoulders. Extend one leg only when 15s is easy.",
      },
      {
        name: "Front Lever Raise",
        note: "3 × 5 from hang to tuck lever and back down slowly.",
      },
      {
        name: "Hanging Leg Raise",
        note: "3 × 8 with straight legs, no swing. Lower slower than you lift.",
      },
      {
        name: "Toes-to-Bar",
        note: "3 × 8. Controlled, not kipping — the point is the tension, not the reps.",
      },
      {
        name: "Hollow Body Hold",
        note: "3 × 30s. Lower back pinned to the floor the whole time or it doesn't count.",
      },
      {
        name: "Windshield Wiper",
        note: "3 × 6 per side, hanging. Rotational tension for cutting loose.",
      },
      {
        name: "Ab Wheel Rollout",
        note: "3 × 8 from the knees, hips tucked under.",
      },
      {
        name: "Tension Board Cut-Loose",
        note: "On overhang: cut feet, pull them back on under control. 5 × 3.",
      },
    ],
  },
  {
    label: "Antagonist & Prehab",
    blurb:
      "The pushing and the wrist extension nobody does until their elbow hurts. Two short sessions a week is the difference between climbing for decades and taking six months off.",
    exercises: [
      {
        name: "Push-Up",
        note: "3 × 15. The simplest counter to a life of pulling.",
      },
      {
        name: "Ring Dip",
        note: "3 × 8, shoulders down. Scale with a band before adding weight.",
      },
      {
        name: "Reverse Wrist Curl",
        note: "3 × 15 light. Extensors, for climber's elbow — the boring one that works.",
      },
      {
        name: "Band Wrist Extension",
        note: "2 × 20 per side. Cheap enough to do while the kettle boils.",
      },
      {
        name: "Shoulder External Rotation",
        note: "3 × 15 per side with a band, elbow pinned to your side.",
      },
      {
        name: "Scapular Push-Up",
        note: "3 × 12. Protract and retract with straight arms — serratus work.",
      },
      {
        name: "Reverse Fly",
        note: "3 × 15 light. Rear delts, to sit the shoulders back where they belong.",
      },
      {
        name: "Pronator Twist",
        note: "2 × 12 per side with a hammer or a loaded bar. Elbow health, direct.",
      },
    ],
  },
  {
    label: "On the Wall",
    blurb:
      "The training that is still climbing. Do these when fresh — a technique drill done tired teaches you to move like you're tired.",
    exercises: [
      {
        name: "Limit Bouldering",
        note: "Problems of 1–3 moves at your absolute ceiling. 5 min rest between attempts, 60–90 min total.",
      },
      {
        name: "Boulder 4x4",
        note: "4 problems, 4 times through, minimal rest inside a round. Power endurance — brutal, effective.",
      },
      {
        name: "Boulder Pyramid",
        note: "Work up and back down the grades in a session. Volume without ego.",
      },
      {
        name: "Silent Feet Drill",
        note: "Climb 3 easy routes without making a sound. Placement, not stabbing.",
      },
      {
        name: "Straight-Arm Drill",
        note: "An easy route with arms locked straight throughout. Teaches hips and feet to do the work.",
      },
      {
        name: "Flagging Drill",
        note: "Easy terrain, outside foot flagged on every move. Stops the barn-door before it starts.",
      },
      {
        name: "Down-Climbing",
        note: "Climb up, reverse it. Doubles time on the wall and forces you to look at your feet.",
      },
      {
        name: "Boulder Traverse",
        note: "Low, long, continuous. Warm-up or endurance depending on how long you stay on.",
      },
    ],
  },
  {
    label: "Endurance",
    blurb:
      "For routes rather than boulders — the capacity to keep going and to recover on the wall instead of off it.",
    exercises: [
      {
        name: "ARC Training",
        note: "20–40 min continuous easy traversing at a light pump that never builds. Aerobic base.",
      },
      {
        name: "Route Laps",
        note: "Two laps back to back on a route two grades below your limit. 4–6 sets, rest 1:1.",
      },
      {
        name: "Route Intervals",
        note: "On the wall 3 min, off 3 min, × 6. Sustained, not desperate.",
      },
      {
        name: "Circuit Board Laps",
        note: "A set circuit of 20–40 moves, repeated. Repeatable, so progress is measurable.",
      },
    ],
  },
  {
    label: "Warm-up & Mobility",
    blurb:
      "Never pull hard cold. Fifteen minutes here is the cheapest injury insurance in the sport.",
    exercises: [
      {
        name: "Easy Traverse",
        note: "5–10 min on big holds, gradually steeper. Blood into the forearms before any load.",
      },
      {
        name: "Wrist Circles",
        note: "20 each direction, then the same with fingers spread.",
      },
      {
        name: "Finger Rolls",
        note: "Open and close the hands 30 times, then the same against light band resistance.",
      },
      {
        name: "Shoulder CARs",
        note: "5 slow controlled circles per side through the fullest range you own.",
      },
      {
        name: "Band Pull-Apart",
        note: "2 × 20. Wakes up the upper back before it has to stabilise anything.",
      },
      {
        name: "Forearm Stretch",
        note: "30s per side each way, after climbing rather than before.",
      },
      {
        name: "Doorway Pec Stretch",
        note: "30s per side. Undoes some of what the wall does to your posture.",
      },
      {
        name: "Thoracic Extension over Foam Roller",
        note: "10 slow extensions. Overhead reach starts in the mid-back.",
      },
    ],
  },
];
