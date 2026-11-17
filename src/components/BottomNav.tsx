export type AppView = "home" | "tracker";

const VIEW_KEY = "workout-tracker-view";

export function loadAppView(): AppView {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (raw === "home" || raw === "tracker") return raw;
  } catch {
    // Storage can be blocked. Home is the default.
  }
  return "home";
}

export function saveAppView(view: AppView): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // The choice still applies for this visit.
  }
}

export function BottomNav({ view, onChange }: { view: AppView; onChange: (view: AppView) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Pages">
      <button type="button" aria-current={view === "home" ? "page" : undefined} onClick={() => onChange("home")}>
        Home
      </button>
      <button
        type="button"
        aria-current={view === "tracker" ? "page" : undefined}
        onClick={() => onChange("tracker")}
      >
        Tracker
      </button>
    </nav>
  );
}
