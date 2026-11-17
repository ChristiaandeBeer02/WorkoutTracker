import type { MuscleGroup } from "./anatomy";

export type DayId = "legs" | "push" | "cardio" | "pull";

export interface ExerciseInfo {
  day: DayId;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  primaryText?: string;
  secondaryExtra?: string;
}

export const PUSH: MuscleGroup[] = ["CHEST", "SHOULDERS_FRONT", "SHOULDERS_SIDE", "TRICEPS"];
export const PULL: MuscleGroup[] = [
  "LATS",
  "RHOMBOIDS",
  "TRAPEZIUS",
  "SHOULDERS_REAR",
  "BICEPS",
  "FOREARMS",
  "BACK_LOWER",
];
export const LEGS: MuscleGroup[] = ["QUADS", "HAMSTRINGS", "GLUTES", "ADDUCTORS", "ABDUCTORS", "CALVES"];
export const CARDIO_LEGS: MuscleGroup[] = ["QUADS", "HAMSTRINGS", "GLUTES", "CALVES"];
export const CORE_SET: MuscleGroup[] = ["CORE", "OBLIQUES"];

const SQUAT: ExerciseInfo = {
  day: "legs",
  primary: ["QUADS", "GLUTES"],
  secondary: ["ADDUCTORS", "HAMSTRINGS", "BACK_LOWER"],
};
const LEG_PRESS: ExerciseInfo = {
  day: "legs",
  primary: ["QUADS", "GLUTES"],
  secondary: ["ADDUCTORS", "HAMSTRINGS"],
};
const SPLIT_SQUAT: ExerciseInfo = {
  day: "legs",
  primary: ["QUADS", "GLUTES"],
  secondary: ["ADDUCTORS", "ABDUCTORS", "HAMSTRINGS"],
};
const CALF: ExerciseInfo = { day: "legs", primary: ["CALVES"], secondary: [] };
const BENCH: ExerciseInfo = {
  day: "push",
  primary: ["CHEST"],
  secondary: ["SHOULDERS_FRONT", "TRICEPS"],
};
const SHOULDER_PRESS: ExerciseInfo = {
  day: "push",
  primary: ["SHOULDERS_FRONT", "SHOULDERS_SIDE"],
  secondary: ["TRICEPS", "TRAPEZIUS"],
};
const DIP: ExerciseInfo = {
  day: "push",
  primary: ["CHEST", "TRICEPS"],
  secondary: ["SHOULDERS_FRONT"],
};
const TRICEP_ISO: ExerciseInfo = { day: "push", primary: ["TRICEPS"], secondary: [] };
const CARDIO: ExerciseInfo = {
  day: "cardio",
  primary: [],
  secondary: CARDIO_LEGS,
  primaryText: "heart and lungs",
};
const ROW: ExerciseInfo = {
  day: "pull",
  primary: ["LATS", "RHOMBOIDS"],
  secondary: ["TRAPEZIUS", "SHOULDERS_REAR", "BICEPS", "BACK_LOWER"],
};
const REAR_DELT: ExerciseInfo = {
  day: "pull",
  primary: ["SHOULDERS_REAR"],
  secondary: ["TRAPEZIUS", "RHOMBOIDS"],
};
const CURL: ExerciseInfo = { day: "pull", primary: ["BICEPS"], secondary: ["FOREARMS"] };
const LEG_RAISE: ExerciseInfo = {
  day: "cardio",
  primary: ["CORE"],
  secondary: ["OBLIQUES"],
  secondaryExtra: "hip flexors",
};
const CRUNCH: ExerciseInfo = { day: "cardio", primary: ["CORE"], secondary: ["OBLIQUES"] };
const ANTI_ROTATION: ExerciseInfo = {
  day: "cardio",
  primary: ["OBLIQUES"],
  secondary: ["CORE"],
};
const ROLLOUT: ExerciseInfo = {
  day: "pull",
  primary: ["CORE"],
  secondary: ["OBLIQUES", "LATS"],
};

export const EXERCISES: Record<string, ExerciseInfo> = {
  "Barbell Squat": SQUAT,
  "Leg Press": LEG_PRESS,
  "Romanian Deadlift": {
    day: "legs",
    primary: ["HAMSTRINGS", "GLUTES"],
    secondary: ["BACK_LOWER", "ADDUCTORS"],
  },
  "Lying Leg Curls": { day: "legs", primary: ["HAMSTRINGS"], secondary: ["CALVES"] },
  "Split Squat with Dumbbells": SPLIT_SQUAT,
  "Barbell Walking Lunge": SPLIT_SQUAT,
  "Hack Squat": { day: "legs", primary: ["QUADS"], secondary: ["GLUTES", "ADDUCTORS"] },
  "Standing Calf Raises": CALF,
  "Seated Calf Raise": CALF,
  "Barbell Bench Press - Medium Grip": BENCH,
  "Dumbbell Bench Press": BENCH,
  "Leverage Chest Press": BENCH,
  "Standing Military Press": SHOULDER_PRESS,
  "Dumbbell Shoulder Press": SHOULDER_PRESS,
  "Machine Shoulder (Military) Press": SHOULDER_PRESS,
  "Dips - Chest Version": DIP,
  "Dip Machine": DIP,
  "Leverage Decline Chest Press": {
    day: "push",
    primary: ["CHEST"],
    secondary: ["TRICEPS", "SHOULDERS_FRONT"],
  },
  "Close-Grip Barbell Bench Press": {
    day: "push",
    primary: ["TRICEPS"],
    secondary: ["CHEST", "SHOULDERS_FRONT"],
  },
  "Triceps Pushdown": TRICEP_ISO,
  "Machine Triceps Extension": TRICEP_ISO,
  "Walking, Treadmill": CARDIO,
  "Running, Treadmill": CARDIO,
  "Wide-Grip Lat Pulldown": {
    day: "pull",
    primary: ["LATS"],
    secondary: ["BICEPS", "SHOULDERS_REAR", "RHOMBOIDS"],
  },
  Pullups: {
    day: "pull",
    primary: ["LATS"],
    secondary: ["BICEPS", "RHOMBOIDS", "SHOULDERS_REAR", "FOREARMS"],
  },
  "Bent Over Barbell Row": ROW,
  "Bent Over Two-Dumbbell Row": {
    day: "pull",
    primary: ["LATS", "RHOMBOIDS"],
    secondary: ["TRAPEZIUS", "SHOULDERS_REAR", "BICEPS"],
  },
  "Face Pull": REAR_DELT,
  "Reverse Machine Flyes": REAR_DELT,
  "Barbell Curl": CURL,
  "Preacher Curl": CURL,
  "Standing Biceps Cable Curl": CURL,
  "Hanging Leg Raise": LEG_RAISE,
  "Flat Bench Lying Leg Raise": LEG_RAISE,
  "Cable Crunch": CRUNCH,
  "Ab Crunch Machine": CRUNCH,
  "Pallof Press": ANTI_ROTATION,
  "Side plank": ANTI_ROTATION,
  Plank: CRUNCH,
  "Dead Bug": LEG_RAISE,
  "Barbell Ab Rollout - On Knees": ROLLOUT,
  "Stability-ball rollout": ROLLOUT,
  "Kneeling Cable Crunch With Alternating Oblique Twists": {
    day: "pull",
    primary: ["CORE"],
    secondary: ["OBLIQUES"],
  },
};

export const SEARCH_NAME: Record<string, string> = {
  "Side plank": "side plank",
  "Stability-ball rollout": "stability ball rollout",
};

export type Part = { kind: "ex"; name: string } | { kind: "text"; text: string };
export type Cell = string | Part[];

export interface DataTable {
  columns: string[];
  align: Array<"start" | "end">;
  rows: Cell[][];
}

function ex(name: string): Part {
  return { kind: "ex", name };
}

function text(value: string): Part {
  return { kind: "text", text: value };
}

function alts(names: string[], sep: string): Part[] {
  const parts: Part[] = [];
  names.forEach((name, index) => {
    if (index > 0) parts.push(text(sep));
    parts.push(ex(name));
  });
  return parts;
}

export const LEGS_TABLE: DataTable = {
  columns: ["Exercise", "Muscles", "Sets", "Fallback"],
  align: ["start", "start", "end", "start"],
  rows: [
    [
      [ex("Barbell Squat")],
      "Quads, glutes, adductors",
      "3 × 8–12",
      [ex("Leg Press")],
    ],
    [
      [ex("Romanian Deadlift")],
      "Hamstrings and glutes",
      "3 × 8–12",
      [ex("Lying Leg Curls")],
    ],
    [
      [ex("Split Squat with Dumbbells")],
      "Quads and glutes, one side at a time",
      "3 × 8–12 each side",
      alts(["Barbell Walking Lunge", "Hack Squat"], ", or "),
    ],
    [
      [ex("Standing Calf Raises")],
      "Calves",
      "3 × 10–15",
      [ex("Seated Calf Raise")],
    ],
  ],
};

export const PUSH_TABLE: DataTable = {
  columns: ["Exercise", "Muscles", "Sets", "Fallback"],
  align: ["start", "start", "end", "start"],
  rows: [
    [
      [ex("Barbell Bench Press - Medium Grip")],
      "Chest, front shoulders, triceps",
      "3 × 8–12",
      alts(["Dumbbell Bench Press", "Leverage Chest Press"], ", or "),
    ],
    [
      [ex("Standing Military Press")],
      "Shoulders, triceps, some upper chest",
      "3 × 6–12",
      alts(["Dumbbell Shoulder Press", "Machine Shoulder (Military) Press"], ", or "),
    ],
    [
      [ex("Dips - Chest Version")],
      "Chest and triceps",
      "3 × 6–12",
      alts(["Dip Machine", "Leverage Decline Chest Press"], ", or "),
    ],
    [
      [ex("Close-Grip Barbell Bench Press")],
      "Triceps and inner chest",
      "3 × 8–12",
      alts(["Triceps Pushdown", "Machine Triceps Extension"], ", or "),
    ],
  ],
};

export const CARDIO_TABLE: DataTable = {
  columns: ["Session", "What it works", "Effort", "Other options"],
  align: ["start", "start", "start", "start"],
  rows: [
    [
      [ex("Walking, Treadmill")],
      "Heart, lungs, and the legs driving the machine",
      "20–30 min, conversational pace",
      "Treadmill, exercise bike, rower, or stepper",
    ],
    [
      [ex("Running, Treadmill")],
      "Heart and lungs at a harder effort",
      "8 rounds of 30 seconds hard, 90 seconds easy",
      "Any cardio machine",
    ],
    ["Cool-down", "Easy recovery", "5–10 min very easy", "Easy walk or spin"],
  ],
};

export const CORE_TABLE: DataTable = {
  columns: ["Exercise", "Muscles", "Sets", "Fallback"],
  align: ["start", "start", "end", "start"],
  rows: [
    [
      [ex("Hanging Leg Raise")],
      "Abs, with obliques and hip flexors",
      "3 × 8–12",
      [ex("Flat Bench Lying Leg Raise")],
    ],
    [[ex("Cable Crunch")], "Abs", "3 × 10–15", [ex("Ab Crunch Machine")]],
    [
      [ex("Pallof Press")],
      "Obliques and abs, resisting rotation",
      "3 × 10 each side",
      [ex("Side plank"), text(", 3 × 30 s each side")],
    ],
    [
      [ex("Plank")],
      "Abs and obliques, bracing",
      "3 × 30–45 s",
      [ex("Dead Bug"), text(", 3 × 8 each side")],
    ],
  ],
};

export const PULL_TABLE: DataTable = {
  columns: ["Exercise", "Muscles", "Sets", "Fallback"],
  align: ["start", "start", "end", "start"],
  rows: [
    [
      [ex("Wide-Grip Lat Pulldown")],
      "Lats, upper back, biceps",
      "3 × 8–12",
      [ex("Pullups")],
    ],
    [
      [ex("Bent Over Barbell Row")],
      "Lats, mid-back, rear shoulders, biceps",
      "3 × 8–12",
      [ex("Bent Over Two-Dumbbell Row")],
    ],
    [[ex("Face Pull")], "Rear shoulders and upper back", "3 × 10–15", [ex("Reverse Machine Flyes")]],
    [
      [ex("Barbell Curl")],
      "Biceps",
      "3 × 8–12",
      alts(["Preacher Curl", "Standing Biceps Cable Curl"], " or "),
    ],
    [
      [ex("Barbell Ab Rollout - On Knees")],
      "Abs, with obliques and lats",
      "3 × 6–10",
      alts(["Stability-ball rollout", "Kneeling Cable Crunch With Alternating Oblique Twists"], ", or "),
    ],
  ],
};

export const TRACKER_DAYS: Array<{ id: DayId; label: string }> = [
  { id: "legs", label: "Legs" },
  { id: "push", label: "Push" },
  { id: "cardio", label: "Cardio + Abs" },
  { id: "pull", label: "Pull" },
];

export function nextTrackerDay(day: DayId): { id: DayId; label: string } {
  const index = TRACKER_DAYS.findIndex((item) => item.id === day);
  return TRACKER_DAYS[(index + 1) % TRACKER_DAYS.length];
}

export interface TrackerSlot {
  id: string;
  options: string[];
  sets: number;
}

const TRACKER_TABLES: Record<DayId, DataTable[]> = {
  legs: [LEGS_TABLE],
  push: [PUSH_TABLE],
  cardio: [CARDIO_TABLE, CORE_TABLE],
  pull: [PULL_TABLE],
};

function exerciseNames(cell: Cell): string[] {
  if (typeof cell === "string") return [];
  return cell.flatMap((part) => (part.kind === "ex" ? [part.name] : []));
}

/** Leading "3 × …" in the plan is that exercise's default set count. */
export function planSetCount(cell: Cell | undefined): number {
  if (typeof cell !== "string") return 3;
  const match = /^(\d+)\s*×/.exec(cell.trim());
  if (!match) return 3;
  const count = Number(match[1]);
  return count >= 1 ? count : 3;
}

export function trackerSlots(day: DayId): TrackerSlot[] {
  const slots: TrackerSlot[] = [];
  for (const table of TRACKER_TABLES[day]) {
    for (const row of table.rows) {
      const primary = exerciseNames(row[0]);
      if (primary.length === 0) continue;
      const fallbacks = exerciseNames(row[row.length - 1]);
      const options = [primary[0]];
      for (const name of fallbacks) {
        if (!options.includes(name)) options.push(name);
      }
      slots.push({ id: primary[0], options, sets: planSetCount(row[2]) });
    }
  }
  return slots;
}
