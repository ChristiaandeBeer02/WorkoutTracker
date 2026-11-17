import type { TrackerDay } from "./days";
import { catalogueByName, normaliseExerciseName } from "./exercises";
import { cardsForDay } from "./trackerStore";

const CUSTOM_KEY = "workout-tracker-custom-exercises";

export interface CustomExercise {
  name: string;
  muscles: string[];
  cardio: boolean;
}

function displayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function readAll(): Record<string, CustomExercise> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<CustomExercise>>;
    const out: Record<string, CustomExercise> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value.name !== "string") continue;
      const muscles = Array.isArray(value.muscles) ? value.muscles.filter((item) => typeof item === "string") : [];
      out[normaliseExerciseName(key)] = {
        name: displayName(value.name),
        muscles,
        cardio: value.cardio === true,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(book: Record<string, CustomExercise>): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(book));
}

export function loadCustomExercises(): CustomExercise[] {
  return Object.values(readAll()).sort((a, b) => a.name.localeCompare(b.name));
}

export function customByName(name: string): CustomExercise | undefined {
  return readAll()[normaliseExerciseName(name)];
}

/** Database names are never stored here. */
export function saveCustomExercise(exercise: CustomExercise): boolean {
  const name = displayName(exercise.name);
  if (!name || catalogueByName(name)) return false;
  const book = readAll();
  book[normaliseExerciseName(name)] = {
    name,
    muscles: [...new Set(exercise.muscles)],
    cardio: exercise.cardio,
  };
  writeAll(book);
  return true;
}

export function deleteCustomExercise(name: string): void {
  const book = readAll();
  delete book[normaliseExerciseName(name)];
  writeAll(book);
}

export function isUnmappedName(name: string): boolean {
  const cleaned = displayName(name);
  if (!cleaned) return false;
  if (catalogueByName(cleaned)) return false;
  if (customByName(cleaned)) return false;
  return true;
}

export function unmappedOnDay(day: TrackerDay): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const card of cardsForDay(day.id)) {
    const name = displayName(card.name);
    const key = normaliseExerciseName(name);
    if (!name || seen.has(key) || !isUnmappedName(name)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function linkWarning(count: number, dayName: string): string {
  const noun = count === 1 ? "exercise" : "exercises";
  const verb = count === 1 ? "has" : "have";
  return `⚠ ${count} ${noun} in ${dayName} ${verb} no muscles linked, figure may be slightly off`;
}
