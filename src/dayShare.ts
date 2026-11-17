import type { DayKey } from "./colors";
import { customByName, saveCustomExercise } from "./customExercises";
import { isPlanDay, loadDays, saveDays, type TrackerDay } from "./days";
import { EXERCISE_CATALOGUE } from "./exercises";
import { trackerSlots } from "./plan";
import { catalogueIndex, type SharedDay, type SharedExercise } from "./shareCodec";
import { loadDayWorkouts, saveDayWorkouts, type WorkoutCard } from "./trackerStore";

export const DAYS_CHANGED_EVENT = "workout-days-changed";

export function notifyDaysChanged(): void {
  window.dispatchEvent(new Event(DAYS_CHANGED_EVENT));
}

export function sharedDaysFromIds(ids: readonly string[]): SharedDay[] {
  const wanted = new Set(ids);
  return loadDays()
    .filter((day) => wanted.has(day.id))
    .map((day) => ({
      name: day.name.trim().replace(/\s+/g, " "),
      color: /^#[0-9a-fA-F]{6}$/.test(day.color) ? day.color.toUpperCase() : "#888888",
      exercises: exercisesForShare(day.id),
    }));
}

export function dayNameTaken(days: readonly TrackerDay[], name: string): boolean {
  const key = name.trim().toLowerCase();
  return days.some((day) => day.name.trim().toLowerCase() === key);
}

export interface AppliedDay {
  id: string;
  color: string;
  planKey: DayKey | null;
}

/** Add imported days at the bottom. Replace keeps the existing day and its history. */
export function applySharedDays(shared: readonly SharedDay[], modes: ReadonlyArray<"new" | "replace" | "add">): AppliedDay[] {
  const next = loadDays().map((day) => ({ ...day }));
  const taken = new Set(next.map((day) => day.name.trim().toLowerCase()));
  const applied: AppliedDay[] = [];

  shared.forEach((day, index) => {
    const mode = modes[index] === "replace" || modes[index] === "add" ? modes[index] : "new";
    const cards = cardsForShared(day);
    if (mode === "replace") {
      const found = next.find((item) => item.name.trim().toLowerCase() === day.name.trim().toLowerCase());
      if (found) {
        found.color = day.color;
        saveDayWorkouts(found.id, cards);
        applied.push({ id: found.id, color: day.color, planKey: planColorKey(found.id) });
        return;
      }
    }
    const name = freshName(taken, day.name, mode !== "new");
    const id = `day-${Date.now().toString(36)}-${index.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    taken.add(name.toLowerCase());
    next.push({ id, name, color: day.color });
    saveDayWorkouts(id, cards);
    applied.push({ id, color: day.color, planKey: null });
  });

  saveDays(next);
  return applied;
}

function exercisesForShare(dayId: string): SharedExercise[] {
  const saved = loadDayWorkouts(dayId);
  const source = saved
    ? saved.map((card) => ({ name: card.name, sets: card.sets }))
    : isPlanDay(dayId)
      ? trackerSlots(dayId).map((slot) => ({ name: slot.options[0], sets: slot.sets }))
      : [];
  const exercises: SharedExercise[] = [];
  for (const item of source) {
    const name = item.name.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const sets = Math.max(1, Math.min(99, Math.round(item.sets) || 3));
    const index = catalogueIndex(name);
    if (index != null) {
      exercises.push({
        name: EXERCISE_CATALOGUE[index].name,
        sets,
        catalogueIndex: index,
        custom: null,
      });
      continue;
    }
    const custom = customByName(name);
    exercises.push({
      name: custom?.name ?? name,
      sets,
      catalogueIndex: null,
      custom: { muscles: custom?.muscles ?? [], cardio: custom?.cardio === true },
    });
  }
  return exercises;
}

function cardsForShared(day: SharedDay): WorkoutCard[] {
  if (day.exercises.length === 0) {
    return [{ id: cardId(0), name: "", options: [], sets: 3 }];
  }
  return day.exercises.map((exercise, index) => ({
    id: cardId(index),
    name: storedExerciseName(exercise),
    options: [],
    sets: exercise.sets,
  }));
}

function storedExerciseName(exercise: SharedExercise): string {
  if (exercise.catalogueIndex != null) return exercise.name;
  const existing = customByName(exercise.name);
  if (existing) return existing.name;
  saveCustomExercise({
    name: exercise.name,
    muscles: exercise.custom?.muscles ?? [],
    cardio: exercise.custom?.cardio === true,
  });
  return customByName(exercise.name)?.name ?? exercise.name;
}

function freshName(taken: Set<string>, base: string, forceSuffix: boolean): string {
  const name = base.trim().replace(/\s+/g, " ");
  if (!forceSuffix && !taken.has(name.toLowerCase())) return name;
  let n = 2;
  while (taken.has(`${name} (${n})`.toLowerCase())) n += 1;
  return `${name} (${n})`;
}

function planColorKey(id: string): DayKey | null {
  if (id === "push" || id === "pull" || id === "legs") return id;
  if (id === "cardio") return "cardioCore";
  return null;
}

function cardId(index: number): string {
  return `added-${Date.now().toString(36)}-${index.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
