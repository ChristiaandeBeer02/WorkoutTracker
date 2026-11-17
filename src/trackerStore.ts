import { isPlanDay, loadDays } from "./days";
import { trackerSlots } from "./plan";

const STATS_KEY = "workout-tracker-v2-stats";
const DAY_KEY = "workout-tracker-v2-day";
const LISTS_KEY = "workout-tracker-v2-lists";
const LEGACY_KEYS = ["workout-tracker-stats", "workout-tracker-day", "workout-tracker-day-lists"];

export interface SetStat {
  weight: string;
  reps: string;
}

export interface ExerciseRecord {
  sets: SetStat[];
}

export type StatBook = Record<string, ExerciseRecord>;

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

function recordFromStored(value: unknown): ExerciseRecord | null {
  if (!value || typeof value !== "object") return null;
  const sets = (value as { sets?: unknown }).sets;
  if (!Array.isArray(sets) || sets.length === 0) return null;
  return { sets: sets.map(asSet) };
}

interface StatsFile {
  version: 2;
  days: Record<string, StatBook>;
}

function dropLegacyKeys(): void {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // Storage can be blocked. The new keys still start empty.
  }
}

function readStatsFile(): StatsFile {
  dropLegacyKeys();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { version: 2, days: {} };
    const parsed = JSON.parse(raw) as { version?: unknown; days?: unknown };
    if (!parsed || parsed.version !== 2 || !parsed.days || typeof parsed.days !== "object") {
      return { version: 2, days: {} };
    }
    const days: Record<string, StatBook> = {};
    for (const [dayId, value] of Object.entries(parsed.days as Record<string, unknown>)) {
      const book: StatBook = {};
      if (!value || typeof value !== "object") continue;
      for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
        const record = recordFromStored(entry);
        if (record) book[name] = record;
      }
      days[dayId] = book;
    }
    return { version: 2, days };
  } catch {
    return { version: 2, days: {} };
  }
}

function writeStatsFile(file: StatsFile): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(file));
}

export function loadStats(dayId: string): StatBook {
  try {
    return readStatsFile().days[dayId] ?? {};
  } catch {
    return {};
  }
}

export function saveStats(dayId: string, book: StatBook): void {
  try {
    const file = readStatsFile();
    file.days[dayId] = book;
    writeStatsFile(file);
  } catch {
    // The session still updates on screen if storage is blocked.
  }
}

export function purgeDayData(dayId: string): void {
  try {
    const file = readStatsFile();
    delete file.days[dayId];
    writeStatsFile(file);
    const raw = localStorage.getItem(LISTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    delete parsed[dayId];
    localStorage.setItem(LISTS_KEY, JSON.stringify(parsed));
  } catch {
    // The day is already gone from the list on screen.
  }
}

/** Drop every saved list so the default days show the plan again, and drop stats for removed days. */
export function resetStoredWorkouts(keepDayIds: string[]): void {
  try {
    localStorage.removeItem(LISTS_KEY);
    const file = readStatsFile();
    const keep = new Set(keepDayIds);
    for (const id of Object.keys(file.days)) {
      if (!keep.has(id)) delete file.days[id];
    }
    writeStatsFile(file);
  } catch {
    // The reset still applies to the day list.
  }
}

export function loadTrackerDay(): string {
  const days = loadDays();
  try {
    const raw = localStorage.getItem(DAY_KEY);
    if (raw && days.some((day) => day.id === raw)) return raw;
  } catch {
    // Fall through to the first day.
  }
  return days[0]?.id ?? "legs";
}

export function saveTrackerDay(day: string): void {
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

export function loadDayWorkouts(day: string): WorkoutCard[] | null {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const list = parsed[day];
    if (!Array.isArray(list)) return null;
    const cards = list.filter(isWorkoutCard);
    return cards;
  } catch {
    return null;
  }
}

/** Saved list, or the plan for that day when nothing has been saved yet. */
export function cardsForDay(day: string): WorkoutCard[] {
  const saved = loadDayWorkouts(day);
  if (saved) return saved;
  if (!isPlanDay(day)) {
    return [{ id: `blank-${day}`, name: "", options: [], sets: 3 }];
  }
  const book = loadStats(day);
  return trackerSlots(day).map((slot) => ({
    id: slot.id,
    name: slot.options[0],
    options: slot.options,
    sets: rememberedSetCount(book[slot.options[0]], slot.sets),
  }));
}

/** Append one exercise card and persist the day, including the plan if it was still unsaved. */
export function appendExerciseToDay(day: string, name: string): void {
  const cards = [
    ...cardsForDay(day),
    {
      id: `added-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      options: [],
      sets: 3,
    },
  ];
  saveDayWorkouts(day, cards);
}

export function saveDayWorkouts(day: string, cards: WorkoutCard[]): void {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, WorkoutCard[]>) : {};
    parsed[day] = cards;
    localStorage.setItem(LISTS_KEY, JSON.stringify(parsed));
  } catch {
    // The list still applies for this visit.
  }
}
