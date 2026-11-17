export type AppView = "home" | "tracker";

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
