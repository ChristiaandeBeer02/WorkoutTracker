import { TRACKER_DAYS, type DayId } from "./plan";

const STATS_KEY = "workout-tracker-stats";
const DAY_KEY = "workout-tracker-day";

export interface ExerciseStat {
  weight: string;
  reps: string;
}

export type StatBook = Record<string, ExerciseStat>;

export function loadStats(): StatBook {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<ExerciseStat>>;
    const book: StatBook = {};
    for (const [name, stat] of Object.entries(parsed)) {
      if (!stat || typeof stat !== "object") continue;
      book[name] = {
        weight: typeof stat.weight === "string" ? stat.weight : "",
        reps: typeof stat.reps === "string" ? stat.reps : "",
      };
    }
    return book;
  } catch {
    return {};
  }
}

export function saveStats(book: StatBook): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(book));
  } catch {
    // The session still updates on screen if storage is blocked.
  }
}

export function loadTrackerDay(): DayId {
  try {
    const raw = localStorage.getItem(DAY_KEY);
    if (TRACKER_DAYS.some((day) => day.id === raw)) return raw as DayId;
  } catch {
    // Fall through to the default day.
  }
  return "legs";
}

export function saveTrackerDay(day: DayId): void {
  try {
    localStorage.setItem(DAY_KEY, day);
  } catch {
    // The choice still applies for this visit.
  }
}

export function isBlank(value: string): boolean {
  return value.trim() === "";
}

/** Keep an exercise's previous stats when both new inputs are empty. */
export function applySession(
  book: StatBook,
  entries: Array<{ name: string; weight: string; reps: string }>,
): { book: StatBook; saved: number } {
  const next: StatBook = { ...book };
  let saved = 0;
  for (const entry of entries) {
    if (isBlank(entry.weight) && isBlank(entry.reps)) continue;
    next[entry.name] = { weight: entry.weight.trim(), reps: entry.reps.trim() };
    saved += 1;
  }
  return { book: next, saved };
}

export function displayStat(value: string | undefined): string {
  if (value == null || value.trim() === "") return "-";
  return value;
}
