import type { MuscleGroup } from "./anatomy";
import type { TrackerDay } from "./days";
import { catalogueByName, exerciseIsCardio, labelize, type CatalogueExercise } from "./exercises";
import { OPACITY } from "./colors";
import { paintAll, type Paint } from "./paint";
import { cardsForDay } from "./trackerStore";

/**
 * Every free-exercise-db muscle name, mapped onto the figure.
 * Abdominals also cover the oblique region, because the catalogue has no separate oblique name.
 * Shoulders cover the front, side, and rear regions.
 * Neck is drawn on both figures; the catalogue has no traced neck in MuscleMap itself.
 */
export const DB_MUSCLE_REGIONS: Record<string, MuscleGroup[]> = {
  abdominals: ["CORE", "OBLIQUES"],
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
  neck: ["NECK"],
  quadriceps: ["QUADS"],
  shoulders: ["SHOULDERS_FRONT", "SHOULDERS_SIDE", "SHOULDERS_REAR"],
  traps: ["TRAPEZIUS"],
  triceps: ["TRICEPS"],
};

export interface DayMuscles {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  names: string[];
}

function regionsFor(names: readonly string[]): MuscleGroup[] {
  const groups: MuscleGroup[] = [];
  for (const name of names) {
    for (const group of DB_MUSCLE_REGIONS[name] ?? []) {
      if (!groups.includes(group)) groups.push(group);
    }
  }
  return groups;
}

export function musclesForExercise(exercise: CatalogueExercise | null | undefined): DayMuscles {
  if (!exercise) return { primary: [], secondary: [], names: [] };
  const primary = regionsFor(exercise.primaryMuscles);
  const secondary = regionsFor(exercise.secondaryMuscles).filter((group) => !primary.includes(group));
  return { primary, secondary, names: exercise.primaryMuscles };
}

/** Union of the catalogue muscles for the exercises currently on this day. Unknown names add nothing. */
export function musclesForDay(day: TrackerDay): DayMuscles {
  const primary = new Set<MuscleGroup>();
  const secondary = new Set<MuscleGroup>();
  const names: string[] = [];
  const seen = new Set<string>();
  for (const card of cardsForDay(day.id)) {
    const exercise = catalogueByName(card.name);
    if (!exercise) continue;
    for (const name of exercise.primaryMuscles) {
      const key = name.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
      for (const group of DB_MUSCLE_REGIONS[name] ?? []) primary.add(group);
    }
    for (const name of exercise.secondaryMuscles) {
      for (const group of DB_MUSCLE_REGIONS[name] ?? []) secondary.add(group);
    }
  }
  for (const group of primary) secondary.delete(group);
  return { primary: [...primary], secondary: [...secondary], names };
}

export function plainMuscleLine(names: readonly string[]): string {
  return names.map((name) => labelize(name)).join(", ");
}

/** Highest day in the list wins. Primary paint covers a lighter secondary from the same day. */
export function paintDays(days: TrackerDay[]): Paint {
  const paint: Paint = {};
  for (const day of [...days].reverse()) {
    const muscles = musclesForDay(day);
    Object.assign(paint, paintAll(muscles.secondary, day.color, OPACITY.secondary));
    Object.assign(paint, paintAll(muscles.primary, day.color, OPACITY.primary));
  }
  return paint;
}

export function paintExercise(exercise: CatalogueExercise | null | undefined): Paint {
  const muscles = musclesForExercise(exercise);
  return {
    ...paintAll(muscles.secondary, "var(--accent)", OPACITY.secondary),
    ...paintAll(muscles.primary, "var(--accent)", OPACITY.primary),
  };
}

export function dayHasCardio(day: TrackerDay): boolean {
  return cardsForDay(day.id).some(
    (card) => exerciseIsCardio(card.name) || card.options.some((option) => exerciseIsCardio(option)),
  );
}
