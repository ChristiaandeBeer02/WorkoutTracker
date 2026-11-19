import type { TrackerDay } from "./days";
import { catalogueByName, normaliseExerciseName } from "./exercises";
import { CATALOGUE_MUSCLE_NAMES } from "./muscles";
import { cardsForDay } from "./trackerStore";

const CUSTOM_KEY = "workout-tracker-custom-exercises";

export const CUSTOM_CHANGED_EVENT = "workout-custom-changed";

function notifyCustomChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOM_CHANGED_EVENT));
}

export interface CustomExercise {
  name: string;
  /** Main muscles, in catalogue order. */
  muscles: string[];
  /** Lighter muscles, in catalogue order. Never overlaps `muscles`. */
  secondary: string[];
  cardio: boolean;
}

function displayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Catalogue names stay in `CATALOGUE_MUSCLE_NAMES` order. Other strings are kept after them. */
function orderedMuscles(names: readonly string[], skip: ReadonlySet<string>): string[] {
  const known = new Set<string>();
  const extra: string[] = [];
  for (const name of names) {
    const cleaned = name.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (skip.has(key)) continue;
    if ((CATALOGUE_MUSCLE_NAMES as readonly string[]).includes(key)) {
      known.add(key);
      continue;
    }
    if (!extra.some((item) => item.toLowerCase() === key)) extra.push(cleaned);
  }
  return [...CATALOGUE_MUSCLE_NAMES.filter((name) => known.has(name)), ...extra];
}

function splitMuscles(main: readonly string[], secondary: readonly string[]): { muscles: string[]; secondary: string[] } {
  const muscles = orderedMuscles(main, new Set());
  const taken = new Set(muscles.map((name) => name.toLowerCase()));
  return { muscles, secondary: orderedMuscles(secondary, taken) };
}

function readAll(): Record<string, CustomExercise> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<CustomExercise>>;
    const out: Record<string, CustomExercise> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value.name !== "string") continue;
      const split = splitMuscles(stringList(value.muscles), stringList(value.secondary));
      out[normaliseExerciseName(key)] = {
        name: displayName(value.name),
        muscles: split.muscles,
        secondary: split.secondary,
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
  const split = splitMuscles(exercise.muscles, exercise.secondary ?? []);
  book[normaliseExerciseName(name)] = {
    name,
    muscles: split.muscles,
    secondary: split.secondary,
    cardio: exercise.cardio,
  };
  writeAll(book);
  notifyCustomChanged();
  return true;
}

export function deleteCustomExercise(name: string): void {
  const book = readAll();
  delete book[normaliseExerciseName(name)];
  writeAll(book);
  notifyCustomChanged();
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
