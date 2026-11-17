import { DEFAULT_DAY_COLORS, loadDayColors, saveDayColors, type DayKey } from "./colors";
import type { DayId } from "./plan";

export interface TrackerDay {
  id: string;
  name: string;
  color: string;
}

const DAYS_KEY = "workout-tracker-days";
const HEX = /^#[0-9a-fA-F]{6}$/;

const PLAN_ORDER: DayId[] = ["legs", "push", "cardio", "pull"];

const COLOR_KEY_DAY: Record<DayKey, DayId> = {
  legs: "legs",
  push: "push",
  pull: "pull",
  cardioCore: "cardio",
};

export function isPlanDay(id: string): id is DayId {
  return (PLAN_ORDER as readonly string[]).includes(id);
}

export function paletteDays(): TrackerDay[] {
  const colors = loadDayColors();
  return [
    { id: "legs", name: "Legs", color: colors.legs },
    { id: "push", name: "Push", color: colors.push },
    { id: "cardio", name: "Cardio + Abs", color: colors.cardioCore },
    { id: "pull", name: "Pull", color: colors.pull },
  ];
}

function readStoredDays(): TrackerDay[] | null {
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const days: TrackerDay[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const day = value as Partial<TrackerDay>;
      if (typeof day.id !== "string" || day.id.trim() === "") continue;
      if (typeof day.name !== "string" || day.name.trim() === "") continue;
      const color = typeof day.color === "string" && HEX.test(day.color) ? day.color : "#888888";
      days.push({ id: day.id, name: day.name.trim(), color });
    }
    return days.length > 0 ? days : null;
  } catch {
    return null;
  }
}

function dropLegacyTrackerKeys(): void {
  try {
    localStorage.removeItem("workout-tracker-stats");
    localStorage.removeItem("workout-tracker-day");
    localStorage.removeItem("workout-tracker-day-lists");
  } catch {
    // Storage can be blocked. New keys still start empty.
  }
}

export function loadDays(): TrackerDay[] {
  dropLegacyTrackerKeys();
  return readStoredDays() ?? paletteDays();
}

export function saveDays(days: TrackerDay[]): void {
  localStorage.setItem(DAYS_KEY, JSON.stringify(days));
}

export function dayById(days: TrackerDay[], id: string): TrackerDay {
  return days.find((day) => day.id === id) ?? days[0];
}

export function nextDay(days: TrackerDay[], id: string): TrackerDay {
  const index = days.findIndex((day) => day.id === id);
  if (index < 0) return days[0];
  return days[(index + 1) % days.length];
}

export function uniqueDayName(days: TrackerDay[], base: string): string {
  const taken = new Set(days.map((day) => day.name.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}

export function createDay(days: TrackerDay[]): { days: TrackerDay[]; created: TrackerDay } {
  const palette = [DEFAULT_DAY_COLORS.legs, DEFAULT_DAY_COLORS.push, DEFAULT_DAY_COLORS.cardioCore, DEFAULT_DAY_COLORS.pull];
  const created: TrackerDay = {
    id: `day-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: uniqueDayName(days, "New day"),
    color: palette[days.length % palette.length],
  };
  return { days: [...days, created], created };
}

/** The colour panel changed. Update a saved day list, if the user has one. */
export function syncDayFromPanel(key: DayKey, color: string): void {
  const stored = readStoredDays();
  if (!stored || !HEX.test(color)) return;
  const id = COLOR_KEY_DAY[key];
  saveDays(stored.map((day) => (day.id === id ? { ...day, color } : day)));
}

export function resetDayList(): TrackerDay[] {
  const days: TrackerDay[] = [
    { id: "legs", name: "Legs", color: DEFAULT_DAY_COLORS.legs },
    { id: "push", name: "Push", color: DEFAULT_DAY_COLORS.push },
    { id: "cardio", name: "Cardio + Abs", color: DEFAULT_DAY_COLORS.cardioCore },
    { id: "pull", name: "Pull", color: DEFAULT_DAY_COLORS.pull },
  ];
  saveDays(days);
  saveDayColors({ ...DEFAULT_DAY_COLORS });
  return days;
}

export function syncDaysToPalette(): void {
  const stored = readStoredDays();
  if (!stored) return;
  const defaults = paletteDays();
  saveDays(
    stored.map((day) => {
      const match = defaults.find((item) => item.id === day.id);
      return match ? { ...day, color: match.color } : day;
    }),
  );
}
