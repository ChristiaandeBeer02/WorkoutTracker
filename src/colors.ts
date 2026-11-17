/**
 * Every colour and fill strength the app uses.
 *
 * Day colours are the same in light and dark, the way the original data-viz
 * series were: Push blue, Pull yellow, Legs cyan, Cardio + Abs red.
 * Chrome colours follow the viewer's prefers-color-scheme.
 * Change a value here and the overview, legend, day figures and pop-ups follow.
 */

export type DayKey = "push" | "pull" | "legs" | "cardioCore";

export type Scheme = "light" | "dark";

export interface ChromePalette {
  bg: string;
  bgElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  border: string;
  borderSubtle: string;
  fill: string;
  fillHover: string;
  silhouette: string;
  seam: string;
  neutralMuscle: string;
  onPrimary: string;
}

export const DAY_LABELS: Record<DayKey, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  cardioCore: "Cardio + Abs",
};

export const DAY_KEYS: DayKey[] = ["push", "pull", "legs", "cardioCore"];

export const COLOR_CONFIG: {
  days: Record<DayKey, string>;
  chrome: Record<Scheme, ChromePalette>;
  opacity: { primary: number; secondary: number; cardioLegs: number };
} = {
  days: {
    push: "#1084FE",
    pull: "#E6B325",
    legs: "#00AFC4",
    cardioCore: "#E5484D",
  },
  chrome: {
    light: {
      bg: "#FFFFFF",
      bgElevated: "#FFFFFF",
      text: "#111111",
      textSecondary: "rgba(17, 17, 17, 0.62)",
      textTertiary: "rgba(17, 17, 17, 0.42)",
      accent: "#0B6BCB",
      border: "rgba(17, 17, 17, 0.15)",
      borderSubtle: "rgba(17, 17, 17, 0.08)",
      fill: "rgba(17, 17, 17, 0.06)",
      fillHover: "rgba(17, 17, 17, 0.1)",
      silhouette: "rgba(17, 17, 17, 0.15)",
      seam: "#FFFFFF",
      neutralMuscle: "#A3A3A3",
      onPrimary: "#FFFFFF",
    },
    dark: {
      bg: "#070707",
      bgElevated: "#141414",
      text: "#FAFAFA",
      textSecondary: "rgba(250, 250, 250, 0.64)",
      textTertiary: "rgba(250, 250, 250, 0.42)",
      accent: "#7CB6FF",
      border: "rgba(255, 255, 255, 0.16)",
      borderSubtle: "rgba(255, 255, 255, 0.08)",
      fill: "rgba(255, 255, 255, 0.1)",
      fillHover: "rgba(255, 255, 255, 0.16)",
      silhouette: "rgba(255, 255, 255, 0.16)",
      seam: "#070707",
      neutralMuscle: "#8A8A8A",
      onPrimary: "#111111",
    },
  },
  opacity: {
    primary: 1,
    secondary: 0.45,
    cardioLegs: 0.3,
  },
};

export const DEFAULT_DAY_COLORS = COLOR_CONFIG.days;
export const OPACITY = COLOR_CONFIG.opacity;

const STORAGE_KEY = "workout-tracker-day-colors";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function loadDayColors(): Record<DayKey, string> {
  const out: Record<DayKey, string> = { ...DEFAULT_DAY_COLORS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw) as Partial<Record<DayKey, unknown>>;
    for (const key of DAY_KEYS) {
      const value = parsed[key];
      if (typeof value === "string" && HEX.test(value)) out[key] = value;
    }
  } catch {
    return { ...DEFAULT_DAY_COLORS };
  }
  return out;
}

export function saveDayColors(colors: Record<DayKey, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

export function clearDayColors(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function chromeVars(palette: ChromePalette): Record<string, string> {
  return {
    "--bg": palette.bg,
    "--bg-elevated": palette.bgElevated,
    "--text": palette.text,
    "--text-secondary": palette.textSecondary,
    "--text-tertiary": palette.textTertiary,
    "--accent": palette.accent,
    "--border": palette.border,
    "--border-subtle": palette.borderSubtle,
    "--fill": palette.fill,
    "--fill-hover": palette.fillHover,
    "--silhouette": palette.silhouette,
    "--seam": palette.seam,
    "--neutral": palette.neutralMuscle,
    "--on-primary": palette.onPrimary,
  };
}
