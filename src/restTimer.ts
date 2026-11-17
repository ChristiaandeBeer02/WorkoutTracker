export const REST_PRESETS = [
  { label: "30s", ms: 30_000 },
  { label: "60s", ms: 60_000 },
  { label: "90s", ms: 90_000 },
  { label: "2m", ms: 120_000 },
  { label: "3m", ms: 180_000 },
] as const;

export const DEFAULT_DURATION_MS = 90_000;

const STORAGE_KEY = "workout-tracker-rest";

export type RestStatus = "idle" | "running" | "finished";

export interface RestState {
  durationMs: number;
  endAt: number | null;
  status: RestStatus;
  notified: boolean;
}

export function isPreset(ms: number): boolean {
  return REST_PRESETS.some((preset) => preset.ms === ms);
}

export function defaultRestState(): RestState {
  return {
    durationMs: DEFAULT_DURATION_MS,
    endAt: null,
    status: "idle",
    notified: false,
  };
}

export function remainingMs(state: RestState, now: number): number {
  if (state.status !== "running" || state.endAt == null) return 0;
  return Math.max(0, state.endAt - now);
}

/** If the saved end time is already past, the timer is finished. No notification is implied. */
export function reconcile(state: RestState, now: number): RestState {
  if (state.status === "running" && (state.endAt == null || state.endAt <= now)) {
    return { ...state, status: "finished" };
  }
  return state;
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseRestState(raw: string | null, now: number): RestState {
  if (!raw) return defaultRestState();
  try {
    const parsed = JSON.parse(raw) as Partial<RestState>;
    const durationMs =
      typeof parsed.durationMs === "number" && isPreset(parsed.durationMs)
        ? parsed.durationMs
        : DEFAULT_DURATION_MS;
    const status: RestStatus =
      parsed.status === "running" || parsed.status === "finished" ? parsed.status : "idle";
    const endAt = typeof parsed.endAt === "number" ? parsed.endAt : null;
    return reconcile(
      {
        durationMs,
        endAt,
        status,
        notified: Boolean(parsed.notified),
      },
      now,
    );
  } catch {
    return defaultRestState();
  }
}

export function loadRestState(now = Date.now()): RestState {
  try {
    return parseRestState(localStorage.getItem(STORAGE_KEY), now);
  } catch {
    return defaultRestState();
  }
}

export function saveRestState(state: RestState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode can refuse storage. The timer still runs for this visit.
  }
}
