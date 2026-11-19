import type { MuscleGroup } from "./anatomy";
import type { TrackerDay } from "./days";
import { customByName, type CustomExercise } from "./customExercises";
import { catalogueByName, exerciseIsCardio, labelize, type CatalogueExercise } from "./exercises";
export { labelize };
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
  secondaryNames: string[];
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

function dayMuscles(primaryNames: readonly string[], secondaryNamesIn: readonly string[]): DayMuscles {
  const primary = regionsFor(primaryNames);
  const primaryKeys = new Set(primaryNames.map((name) => name.trim().toLowerCase()));
  const secondaryNames = secondaryNamesIn.filter((name) => !primaryKeys.has(name.trim().toLowerCase()));
  const secondary = regionsFor(secondaryNames).filter((group) => !primary.includes(group));
  return { primary, secondary, names: [...primaryNames], secondaryNames };
}

export function musclesForExercise(exercise: CatalogueExercise | CustomExercise | null | undefined): DayMuscles {
  if (!exercise) return { primary: [], secondary: [], names: [], secondaryNames: [] };
  if ("primaryMuscles" in exercise) return dayMuscles(exercise.primaryMuscles, exercise.secondaryMuscles);
  return dayMuscles(exercise.muscles, exercise.secondary ?? []);
}

/** Union of the catalogue muscles for the exercises currently on this day. Unknown names add nothing. */
export function musclesForDay(day: TrackerDay): DayMuscles {
  const primary = new Set<MuscleGroup>();
  const secondary = new Set<MuscleGroup>();
  const names: string[] = [];
  const secondaryNames: string[] = [];
  const seen = new Set<string>();
  const seenSecondary = new Set<string>();
  for (const card of cardsForDay(day.id)) {
    const exercise = workedForName(card.name);
    if (!exercise) continue;
    for (const name of exercise.primary) {
      const key = name.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
      for (const group of DB_MUSCLE_REGIONS[name] ?? []) primary.add(group);
    }
    for (const name of exercise.secondary) {
      const key = name.trim().toLowerCase();
      if (key && !seen.has(key) && !seenSecondary.has(key)) {
        seenSecondary.add(key);
        secondaryNames.push(name);
      }
      for (const group of DB_MUSCLE_REGIONS[name] ?? []) secondary.add(group);
    }
  }
  for (const group of primary) secondary.delete(group);
  return {
    primary: [...primary],
    secondary: [...secondary],
    names,
    secondaryNames: secondaryNames.filter((name) => !seen.has(name.trim().toLowerCase())),
  };
}

export function plainMuscleLine(names: readonly string[]): string {
  return names.map((name) => labelize(name)).join(", ");
}

/** Catalogue order, so covered and missing lists stay stable. */
export const CATALOGUE_MUSCLE_NAMES = Object.keys(DB_MUSCLE_REGIONS);

export interface CoveredMuscle {
  name: string;
  color: string;
}

/** The day highest in the list owns a shared muscle, matching the figure. */
export function coveredAcrossDays(days: readonly TrackerDay[]): CoveredMuscle[] {
  const owner = new Map<string, string>();
  for (const day of [...days].reverse()) {
    const muscles = musclesForDay(day);
    for (const name of muscles.secondaryNames) owner.set(name, day.color);
    for (const name of muscles.names) owner.set(name, day.color);
  }
  return CATALOGUE_MUSCLE_NAMES.filter((name) => owner.has(name)).map((name) => ({
    name,
    color: owner.get(name) ?? "",
  }));
}

export function missingAcrossDays(days: readonly TrackerDay[]): string[] {
  const covered = new Set(coveredAcrossDays(days).map((muscle) => muscle.name));
  return CATALOGUE_MUSCLE_NAMES.filter((name) => !covered.has(name));
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

export function paintWorked(names: readonly string[], color = "var(--accent)"): Paint {
  return paintAll(regionsFor(names), color, OPACITY.primary);
}

function paintDayMuscles(muscles: DayMuscles, color: string): Paint {
  return {
    ...paintAll(muscles.secondary, color, OPACITY.secondary),
    ...paintAll(muscles.primary, color, OPACITY.primary),
  };
}

/** Main at primary opacity, secondary at the lighter opacity. A muscle in both lists is main. */
export function paintCustom(main: readonly string[], secondary: readonly string[], color = "var(--accent)"): Paint {
  return paintDayMuscles(dayMuscles(main, secondary), color);
}

export function paintExercise(exercise: CatalogueExercise | null | undefined): Paint {
  return paintDayMuscles(musclesForExercise(exercise), "var(--accent)");
}

function workedForName(name: string): { primary: string[]; secondary: string[] } | null {
  const catalogue = catalogueByName(name);
  if (catalogue) return { primary: catalogue.primaryMuscles, secondary: catalogue.secondaryMuscles };
  const custom = customByName(name);
  if (!custom) return null;
  return { primary: custom.muscles, secondary: custom.secondary ?? [] };
}

export function nameTrainsCardio(name: string): boolean {
  if (exerciseIsCardio(name)) return true;
  return customByName(name)?.cardio === true;
}

export function dayHasCardio(day: TrackerDay): boolean {
  return cardsForDay(day.id).some(
    (card) => nameTrainsCardio(card.name) || card.options.some((option) => nameTrainsCardio(option)),
  );
}
