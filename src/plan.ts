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
  "Barbell back squat": SQUAT,
  "Leg press": LEG_PRESS,
  "Romanian deadlift": {
    day: "legs",
    primary: ["HAMSTRINGS", "GLUTES"],
    secondary: ["BACK_LOWER", "ADDUCTORS"],
  },
  "Lying or seated hamstring curl": { day: "legs", primary: ["HAMSTRINGS"], secondary: ["CALVES"] },
  "Bulgarian split squat": SPLIT_SQUAT,
  "Walking lunges": SPLIT_SQUAT,
  "hack squat": { day: "legs", primary: ["QUADS"], secondary: ["GLUTES", "ADDUCTORS"] },
  "Standing calf raise": CALF,
  "Seated or standing calf machine": CALF,
  "Barbell bench press": BENCH,
  "Dumbbell bench": BENCH,
  "seated chest press": BENCH,
  "Overhead press": SHOULDER_PRESS,
  "Seated dumbbells": SHOULDER_PRESS,
  "seated shoulder press": SHOULDER_PRESS,
  Dips: DIP,
  "Assisted dip machine": DIP,
  "decline chest press": {
    day: "push",
    primary: ["CHEST"],
    secondary: ["TRICEPS", "SHOULDERS_FRONT"],
  },
  "Close-grip bench press": {
    day: "push",
    primary: ["TRICEPS"],
    secondary: ["CHEST", "SHOULDERS_FRONT"],
  },
  "Cable tricep pushdowns": TRICEP_ISO,
  "tricep extension machine": TRICEP_ISO,
  "Easy steady state": CARDIO,
  Intervals: CARDIO,
  "Lat pulldown": {
    day: "pull",
    primary: ["LATS"],
    secondary: ["BICEPS", "SHOULDERS_REAR", "RHOMBOIDS"],
  },
  "Pull-ups, assisted if needed": {
    day: "pull",
    primary: ["LATS"],
    secondary: ["BICEPS", "RHOMBOIDS", "SHOULDERS_REAR", "FOREARMS"],
  },
  "Barbell bent-over row": ROW,
  "Chest-supported dumbbell row": {
    day: "pull",
    primary: ["LATS", "RHOMBOIDS"],
    secondary: ["TRAPEZIUS", "SHOULDERS_REAR", "BICEPS"],
  },
  "Face pulls": REAR_DELT,
  "Reverse pec deck": REAR_DELT,
  "Barbell or dumbbell curls": CURL,
  "Preacher curl": CURL,
  "cable curl": CURL,
  "Hanging leg raises": LEG_RAISE,
  "Captain's chair knee raises": LEG_RAISE,
  "Cable crunch": CRUNCH,
  "Ab crunch machine": CRUNCH,
  "Pallof press": ANTI_ROTATION,
  "Side plank": ANTI_ROTATION,
  Plank: CRUNCH,
  "Dead bug": LEG_RAISE,
  "Ab-wheel rollout": ROLLOUT,
  "Stability-ball rollout": ROLLOUT,
  "kneeling cable crunch": { day: "pull", primary: ["CORE"], secondary: ["OBLIQUES"] },
};

export const SEARCH_NAME: Record<string, string> = {
  "Lying or seated hamstring curl": "hamstring curl",
  "Seated or standing calf machine": "calf raise machine",
  "Seated dumbbells": "seated dumbbell shoulder press",
  Dips: "chest dips",
  "Cable tricep pushdowns": "cable tricep pushdown",
  "Easy steady state": "zone 2 steady state cardio",
  Intervals: "cardio interval training",
  "Pull-ups, assisted if needed": "pull up",
  "Chest-supported dumbbell row": "chest supported dumbbell row",
  "Barbell or dumbbell curls": "bicep curl",
  "Captain's chair knee raises": "captains chair knee raise",
  "Ab-wheel rollout": "ab wheel rollout",
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
      [ex("Barbell back squat")],
      "Quads, glutes, adductors",
      "3 × 8–12",
      [ex("Leg press")],
    ],
    [
      [ex("Romanian deadlift")],
      "Hamstrings and glutes",
      "3 × 8–12",
      [ex("Lying or seated hamstring curl")],
    ],
    [
      [ex("Bulgarian split squat")],
      "Quads and glutes, one side at a time",
      "3 × 8–12 each side",
      alts(["Walking lunges", "hack squat"], ", or "),
    ],
    [
      [ex("Standing calf raise")],
      "Calves",
      "3 × 10–15",
      [ex("Seated or standing calf machine")],
    ],
  ],
};

export const PUSH_TABLE: DataTable = {
  columns: ["Exercise", "Muscles", "Sets", "Fallback"],
  align: ["start", "start", "end", "start"],
  rows: [
    [
      [ex("Barbell bench press")],
      "Chest, front shoulders, triceps",
      "3 × 8–12",
      alts(["Dumbbell bench", "seated chest press"], ", or "),
    ],
    [
      [ex("Overhead press")],
      "Shoulders, triceps, some upper chest",
      "3 × 6–12",
      alts(["Seated dumbbells", "seated shoulder press"], ", or "),
    ],
    [
      [ex("Dips")],
      "Chest and triceps",
      "3 × 6–12",
      alts(["Assisted dip machine", "decline chest press"], ", or "),
    ],
    [
      [ex("Close-grip bench press")],
      "Triceps and inner chest",
      "3 × 8–12",
      alts(["Cable tricep pushdowns", "tricep extension machine"], ", or "),
    ],
  ],
};

export const CARDIO_TABLE: DataTable = {
  columns: ["Session", "What it works", "Effort", "Other options"],
  align: ["start", "start", "start", "start"],
  rows: [
    [
      [ex("Easy steady state")],
      "Heart, lungs, and the legs driving the machine",
      "20–30 min, conversational pace",
      "Treadmill, exercise bike, rower, or stepper",
    ],
    [
      [ex("Intervals")],
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
      [ex("Hanging leg raises")],
      "Abs, with obliques and hip flexors",
      "3 × 8–12",
      [ex("Captain's chair knee raises")],
    ],
    [[ex("Cable crunch")], "Abs", "3 × 10–15", [ex("Ab crunch machine")]],
    [
      [ex("Pallof press")],
      "Obliques and abs, resisting rotation",
      "3 × 10 each side",
      [ex("Side plank"), text(", 3 × 30 s each side")],
    ],
    [
      [ex("Plank")],
      "Abs and obliques, bracing",
      "3 × 30–45 s",
      [ex("Dead bug"), text(", 3 × 8 each side")],
    ],
  ],
};

export const PULL_TABLE: DataTable = {
  columns: ["Exercise", "Muscles", "Sets", "Fallback"],
  align: ["start", "start", "end", "start"],
  rows: [
    [
      [ex("Lat pulldown")],
      "Lats, upper back, biceps",
      "3 × 8–12",
      [ex("Pull-ups, assisted if needed")],
    ],
    [
      [ex("Barbell bent-over row")],
      "Lats, mid-back, rear shoulders, biceps",
      "3 × 8–12",
      [ex("Chest-supported dumbbell row")],
    ],
    [[ex("Face pulls")], "Rear shoulders and upper back", "3 × 10–15", [ex("Reverse pec deck")]],
    [
      [ex("Barbell or dumbbell curls")],
      "Biceps",
      "3 × 8–12",
      alts(["Preacher curl", "cable curl"], " or "),
    ],
    [
      [ex("Ab-wheel rollout")],
      "Abs, with obliques and lats",
      "3 × 6–10",
      alts(["Stability-ball rollout", "kneeling cable crunch"], ", or "),
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
