import type { MuscleGroup } from "./anatomy";
import type { TrackerDay } from "./days";
import { isPlanDay } from "./days";
import { catalogueByName } from "./exercises";
import { CARDIO_LEGS, CORE_SET, EXERCISES, LEGS, PULL, PUSH } from "./plan";
import { cardsForDay } from "./trackerStore";

/**
 * Catalogue muscle names that already have a region on the figure.
 * Neck has no region. Shoulders are not split in the catalogue, so they
 * use the front and side regions. Rear shoulders, obliques, and the heart
 * stay on the hard-coded day groups when a catalogue name does not match.
 */
const FROM_CATALOGUE: Record<string, MuscleGroup[]> = {
  abdominals: ["CORE"],
  abductors: ["ABDUCTORS"],
  adductors: ["ADDUCTORS"],
  biceps: ["BICEPS"],
  calves: ["CALVES"],
  chest: ["CHEST"],
  forearms: ["FOREARMS"],
  glutes: ["GLUTES"],
  hamstrings: ["HAMSTRINGS"],
  lats: ["LATS"],
  "lower back": ["BACK_LOWER"],
  "middle back": ["RHOMBOIDS"],
  quadriceps: ["QUADS"],
  shoulders: ["SHOULDERS_FRONT", "SHOULDERS_SIDE"],
  traps: ["TRAPEZIUS"],
  triceps: ["TRICEPS"],
};

const PLAN_GROUPS: Record<string, readonly MuscleGroup[]> = {
  legs: LEGS,
  push: PUSH,
  cardio: [...CORE_SET, ...CARDIO_LEGS],
  pull: [...PULL, "CORE"],
};

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  CHEST: "Chest",
  SHOULDERS_FRONT: "Front shoulders",
  SHOULDERS_SIDE: "Side shoulders",
  SHOULDERS_REAR: "Rear shoulders",
  TRICEPS: "Triceps",
  BICEPS: "Biceps",
  FOREARMS: "Forearms",
  LATS: "Lats",
  TRAPEZIUS: "Traps",
  RHOMBOIDS: "Mid-back",
  BACK_LOWER: "Lower back",
  CORE: "Abs",
  OBLIQUES: "Obliques",
  QUADS: "Quads",
  HAMSTRINGS: "Hamstrings",
  GLUTES: "Glutes",
  ADDUCTORS: "Adductors",
  ABDUCTORS: "Abductors",
  CALVES: "Calves",
};

export function musclesForDay(day: TrackerDay): MuscleGroup[] {
  const found = new Set<MuscleGroup>();
  for (const card of cardsForDay(day.id)) {
    const exercise = catalogueByName(card.name);
    if (exercise) {
      for (const muscle of exercise.primaryMuscles) {
        for (const group of FROM_CATALOGUE[muscle] ?? []) found.add(group);
      }
      continue;
    }
    const known = EXERCISES[card.name.trim()];
    if (known) {
      for (const group of known.primary) found.add(group);
    }
  }
  if (found.size > 0) return [...found];
  if (isPlanDay(day.id)) return [...PLAN_GROUPS[day.id]];
  return [];
}

export function muscleLine(groups: readonly MuscleGroup[]): string {
  return groups.map((group) => GROUP_LABEL[group]).join(", ");
}
