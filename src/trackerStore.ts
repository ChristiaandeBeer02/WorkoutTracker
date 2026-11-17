import { TRACKER_DAYS, type DayId } from "./plan";

const STATS_KEY = "workout-tracker-stats";
const DAY_KEY = "workout-tracker-day";
const LISTS_KEY = "workout-tracker-day-lists";

export interface SetStat {
  weight: string;
  reps: string;
}

export interface ExerciseRecord {
  sets: SetStat[];
}

export type StatBook = Record<string, ExerciseRecord>;

interface LegacyStat {
  weight?: unknown;
  reps?: unknown;
  sets?: unknown;
}

function blankSet(): SetStat {
  return { weight: "", reps: "" };
}

function asSet(value: unknown): SetStat {
  if (!value || typeof value !== "object") return blankSet();
  const row = value as Partial<SetStat>;
  return {
    weight: typeof row.weight === "string" ? row.weight : "",
    reps: typeof row.reps === "string" ? row.reps : "",
  };
}

/** Old single-row stats become set 1. */
export function recordFromStored(value: unknown): ExerciseRecord | null {
  if (!value || typeof value !== "object") return null;
  const stat = value as LegacyStat;
  if (Array.isArray(stat.sets)) {
    const sets = stat.sets.map(asSet);
    return sets.length > 0 ? { sets } : null;
  }
  if ("weight" in stat || "reps" in stat) {
    return {
      sets: [
        {
          weight: typeof stat.weight === "string" ? stat.weight : "",
          reps: typeof stat.reps === "string" ? stat.reps : "",
        },
      ],
    };
  }
  return null;
}

export function parseStats(raw: string | null): { book: StatBook; migrated: boolean } {
  if (!raw) return { book: {}, migrated: false };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const book: StatBook = {};
    let migrated = false;
    for (const [name, value] of Object.entries(parsed)) {
      const record = recordFromStored(value);
      if (!record) continue;
      book[name] = record;
      const original = value as LegacyStat;
      if (!Array.isArray(original?.sets)) migrated = true;
    }
    return { book, migrated };
  } catch {
    return { book: {}, migrated: false };
  }
}

export function loadStats(): StatBook {
  try {
    const { book, migrated } = parseStats(localStorage.getItem(STATS_KEY));
    if (migrated) saveStats(book);
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

export function setIsBlank(row: SetStat): boolean {
  return isBlank(row.weight) && isBlank(row.reps);
}

export interface SessionEntry {
  name: string;
  sets: SetStat[];
}

/**
 * Empty set rows keep that set's previous numbers.
 * An exercise whose sets are all empty is left untouched, including its set count.
 */
export function applySession(
  book: StatBook,
  entries: SessionEntry[],
): { book: StatBook; saved: number } {
  const next: StatBook = { ...book };
  let saved = 0;
  for (const entry of entries) {
    if (entry.sets.length === 0 || entry.sets.every(setIsBlank)) continue;
    const previous = book[entry.name]?.sets ?? [];
    const sets = entry.sets.map((row, index) => {
      if (setIsBlank(row)) return previous[index] ? { ...previous[index] } : blankSet();
      return { weight: row.weight.trim(), reps: row.reps.trim() };
    });
    next[entry.name] = { sets };
    saved += 1;
  }
  return { book: next, saved };
}

export function displayStat(value: string | undefined): string {
  if (value == null || value.trim() === "") return "-";
  return value;
}

export function rememberedSetCount(record: ExerciseRecord | undefined, planSets: number): number {
  if (record && record.sets.length > 0) return record.sets.length;
  return planSets >= 1 ? planSets : 3;
}

export interface WorkoutCard {
  id: string;
  name: string;
  options: string[];
  sets: number;
}

function isWorkoutCard(value: unknown): value is WorkoutCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<WorkoutCard>;
  return (
    typeof card.id === "string" &&
    card.id.length > 0 &&
    typeof card.name === "string" &&
    typeof card.sets === "number" &&
    card.sets >= 1 &&
    Array.isArray(card.options) &&
    card.options.every((option) => typeof option === "string")
  );
}

export function loadDayWorkouts(day: DayId): WorkoutCard[] | null {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<DayId, unknown>>;
    const list = parsed[day];
    if (!Array.isArray(list)) return null;
    const cards = list.filter(isWorkoutCard);
    return cards;
  } catch {
    return null;
  }
}

export function saveDayWorkouts(day: DayId, cards: WorkoutCard[]): void {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<DayId, WorkoutCard[]>>) : {};
    parsed[day] = cards;
    localStorage.setItem(LISTS_KEY, JSON.stringify(parsed));
  } catch {
    // The list still applies for this visit.
  }
}
