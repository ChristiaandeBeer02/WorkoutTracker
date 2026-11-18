/**
 * Weights and reps the user has typed but not submitted.
 * Kept per day so a reload, a tab change, or a resumed PWA can put them back.
 * Cleared only when that day is submitted or a card/day is removed.
 */

const DRAFTS_KEY = "workout-tracker-v2-drafts";

export interface SetDraft {
  weight: string;
  reps: string;
}

export interface DraftBook {
  sets: Record<string, Record<string, SetDraft[]>>;
  counts: Record<string, Record<string, number>>;
}

export const DRAFT_SAVE_MS = 250;

export function emptyDraftBook(): DraftBook {
  return { sets: {}, counts: {} };
}

export function blankSetDraft(): SetDraft {
  return { weight: "", reps: "" };
}

function asSet(value: unknown): SetDraft {
  if (!value || typeof value !== "object") return blankSetDraft();
  const row = value as Partial<SetDraft>;
  return {
    weight: typeof row.weight === "string" ? row.weight : "",
    reps: typeof row.reps === "string" ? row.reps : "",
  };
}

function asRows(value: unknown): SetDraft[] | null {
  if (!Array.isArray(value)) return null;
  return value.map(asSet);
}

function asCounts(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!value || typeof value !== "object") return counts;
  for (const [cardId, count] of Object.entries(value as Record<string, unknown>)) {
    if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 99) continue;
    counts[cardId] = count;
  }
  return counts;
}

export function parseDraftBook(raw: string | null): DraftBook {
  if (!raw) return emptyDraftBook();
  try {
    const parsed = JSON.parse(raw) as { sets?: unknown; counts?: unknown };
    if (!parsed || typeof parsed !== "object") return emptyDraftBook();
    const sets: DraftBook["sets"] = {};
    if (parsed.sets && typeof parsed.sets === "object") {
      for (const [dayId, cards] of Object.entries(parsed.sets as Record<string, unknown>)) {
        if (!cards || typeof cards !== "object") continue;
        const daySets: Record<string, SetDraft[]> = {};
        for (const [cardId, rows] of Object.entries(cards as Record<string, unknown>)) {
          const parsedRows = asRows(rows);
          if (parsedRows) daySets[cardId] = parsedRows;
        }
        if (Object.keys(daySets).length > 0) sets[dayId] = daySets;
      }
    }
    const counts: DraftBook["counts"] = {};
    if (parsed.counts && typeof parsed.counts === "object") {
      for (const [dayId, cards] of Object.entries(parsed.counts as Record<string, unknown>)) {
        const dayCounts = asCounts(cards);
        if (Object.keys(dayCounts).length > 0) counts[dayId] = dayCounts;
      }
    }
    return { sets, counts };
  } catch {
    return emptyDraftBook();
  }
}

export function serializeDraftBook(book: DraftBook): string {
  return JSON.stringify({ sets: book.sets, counts: book.counts });
}

export function bookIsEmpty(book: DraftBook): boolean {
  return Object.keys(book.sets).length === 0 && Object.keys(book.counts).length === 0;
}

export function loadDraftBook(): DraftBook {
  try {
    return parseDraftBook(localStorage.getItem(DRAFTS_KEY));
  } catch {
    return emptyDraftBook();
  }
}

let flushDrafts: (() => void) | null = null;

/** Tracker registers this so an update reload can save the latest typed sets. */
export function setDraftFlusher(flush: () => void): () => void {
  flushDrafts = flush;
  return () => {
    if (flushDrafts === flush) flushDrafts = null;
  };
}

export function flushDraftsNow(): void {
  flushDrafts?.();
}

export function saveDraftBook(book: DraftBook): void {
  try {
    if (bookIsEmpty(book)) localStorage.removeItem(DRAFTS_KEY);
    else localStorage.setItem(DRAFTS_KEY, serializeDraftBook(book));
  } catch {
    // The numbers stay on screen for this visit if storage is blocked.
  }
}

export function visibleSetRows(rows: readonly SetDraft[] | undefined, count: number): SetDraft[] {
  const size = Math.max(1, count);
  return Array.from({ length: size }, (_, index) => rows?.[index] ?? blankSetDraft());
}

export function withUpdatedSet(
  book: DraftBook,
  dayId: string,
  cardId: string,
  index: number,
  count: number,
  field: keyof SetDraft,
  value: string,
): DraftBook {
  const daySets = book.sets[dayId] ?? {};
  const rows = visibleSetRows(daySets[cardId], count);
  const current = rows[index] ?? blankSetDraft();
  rows[index] = { ...current, [field]: value };
  return {
    sets: { ...book.sets, [dayId]: { ...daySets, [cardId]: rows } },
    counts: book.counts,
  };
}

export function withUpdatedCount(book: DraftBook, dayId: string, cardId: string, count: number): DraftBook {
  const dayCounts = { ...(book.counts[dayId] ?? {}), [cardId]: count };
  return { sets: book.sets, counts: { ...book.counts, [dayId]: dayCounts } };
}

export function withoutCard(book: DraftBook, dayId: string, cardId: string): DraftBook {
  const daySets = { ...(book.sets[dayId] ?? {}) };
  const dayCounts = { ...(book.counts[dayId] ?? {}) };
  delete daySets[cardId];
  delete dayCounts[cardId];
  const sets = { ...book.sets };
  const counts = { ...book.counts };
  if (Object.keys(daySets).length === 0) delete sets[dayId];
  else sets[dayId] = daySets;
  if (Object.keys(dayCounts).length === 0) delete counts[dayId];
  else counts[dayId] = dayCounts;
  return { sets, counts };
}

export function withoutDay(book: DraftBook, dayId: string): DraftBook {
  const sets = { ...book.sets };
  const counts = { ...book.counts };
  delete sets[dayId];
  delete counts[dayId];
  return { sets, counts };
}

export function forgetDraftDay(dayId: string): void {
  saveDraftBook(withoutDay(loadDraftBook(), dayId));
}

export function forgetAllDrafts(): void {
  try {
    localStorage.removeItem(DRAFTS_KEY);
  } catch {
    // Reset still clears the day list.
  }
}
