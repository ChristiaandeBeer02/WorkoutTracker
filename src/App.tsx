import { useState } from "react";
import { BottomNav, loadAppView, saveAppView, type AppView } from "./components/BottomNav";
import { ExercisePage } from "./components/ExercisePage";
import { Figure } from "./components/Figure";
import { RestBar } from "./components/RestBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { Tracker } from "./components/Tracker";
import { OPACITY } from "./colors";
import { loadDays } from "./days";
import { muscleLine, musclesForDay } from "./muscles";
import { paintAll, type Paint } from "./paint";
import { loadDayLog, type DayLog } from "./trackerStore";
import { useTheme } from "./theme";

export function App() {
  const [view, setView] = useState<AppView>(loadAppView);

  function changeView(next: AppView) {
    setView(next);
    saveAppView(next);
  }

  return (
    <>
      <RestBar />
      {view === "home" ? <Page /> : view === "tracker" ? <Tracker /> : <ExercisePage />}
      <BottomNav view={view} onChange={changeView} />
    </>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Page() {
  const { colors, setColor, resetColors } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const days = loadDays();
  const cards = days.map((day) => ({
    day,
    log: loadDayLog(day.id),
    muscles: musclesForDay(day),
  }));
  const anyLogged = cards.some((card) => Object.keys(card.log.book).length > 0);
  const paint: Paint = {};
  for (const card of [...cards].reverse()) {
    Object.assign(paint, paintAll(card.muscles, card.day.color, OPACITY.primary));
  }

  return (
    <main className="page">
      <header className="mast">
        <h1>Workouts</h1>
        <button
          type="button"
          className="btn btn-quiet"
          aria-expanded={settingsOpen}
          aria-controls="colour-settings"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          Colours
        </button>
        {settingsOpen ? (
          <SettingsPanel colors={colors} onChange={setColor} onReset={resetColors} />
        ) : null}
      </header>

      <section className="section" aria-labelledby="muscles-heading">
        <h2 id="muscles-heading">Muscles</h2>
        <div className="legend">
          {days.map((day) => (
            <LegendItem key={day.id} label={day.name} color={day.color} />
          ))}
        </div>
        <div className="figure">
          <Figure paint={paint} label="Muscles the days cover, front and back" />
        </div>
      </section>

      <section className="section" aria-labelledby="last-heading">
        <h2 id="last-heading">Last workout</h2>
        {anyLogged ? (
          <div className="last-list">
            {cards.map((card) => (
              <LastCard key={card.day.id} name={card.day.name} color={card.day.color} muscles={muscleLine(card.muscles)} log={card.log} />
            ))}
          </div>
        ) : (
          <p className="last-empty">No exercise recorded</p>
        )}
      </section>
    </main>
  );
}

function LastCard({
  name,
  color,
  muscles,
  log,
}: {
  name: string;
  color: string;
  muscles: string;
  log: DayLog;
}) {
  const entries = Object.entries(log.book);
  return (
    <article className="last-card" style={{ borderLeftColor: color }}>
      <h3>{name}</h3>
      {muscles ? <p className="last-muscles">{muscles}</p> : null}
      {entries.length === 0 ? (
        <p className="last-empty">No exercise recorded</p>
      ) : (
        <>
          {log.loggedAt ? <p className="last-date">{formatWhen(log.loggedAt)}</p> : null}
          {entries.map(([exercise, record]) => (
            <div key={exercise} className="last-exercise">
              <p className="last-name">{exercise}</p>
              {record.sets
                .filter((set) => set.weight.trim() !== "" || set.reps.trim() !== "")
                .map((set, index) => (
                  <p key={index} className="last-set">
                    {set.weight} × {set.reps}
                  </p>
                ))}
            </div>
          ))}
        </>
      )}
    </article>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <span className="legend-item">
      <span className="swatch" style={{ background: color }} />
      {label}
    </span>
  );
}
