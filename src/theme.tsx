import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  chromeVars,
  clearDayColors,
  COLOR_CONFIG,
  DEFAULT_DAY_COLORS,
  loadDayColors,
  saveDayColors,
  type DayKey,
  type Scheme,
} from "./colors";
import { syncDayFromPanel, syncDaysToPalette } from "./days";

interface ThemeValue {
  scheme: Scheme;
  colors: Record<DayKey, string>;
  setColor: (key: DayKey, value: string) => void;
  resetColors: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function readScheme(): Scheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>(readScheme);
  const [colors, setColors] = useState(loadDayColors);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setScheme(media.matches ? "dark" : "light");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const vars = {
      ...chromeVars(COLOR_CONFIG.chrome[scheme]),
      "--push": colors.push,
      "--pull": colors.pull,
      "--legs": colors.legs,
      "--cardio": colors.cardioCore,
    };
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
    root.style.colorScheme = scheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute("content", COLOR_CONFIG.chrome[scheme].bg);
  }, [scheme, colors]);

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      colors,
      setColor: (key, next) => {
        setColors((current) => {
          const updated = { ...current, [key]: next };
          saveDayColors(updated);
          syncDayFromPanel(key, next);
          return updated;
        });
      },
      resetColors: () => {
        clearDayColors();
        setColors({ ...DEFAULT_DAY_COLORS });
        syncDaysToPalette();
      },
    }),
    [scheme, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
