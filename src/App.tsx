import { useState, type ReactNode } from "react";
import { BottomNav, loadAppView, saveAppView, type AppView } from "./components/BottomNav";
import { ExercisePage } from "./components/ExercisePage";
import { Figure } from "./components/Figure";
import { RestBar } from "./components/RestBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { Tracker } from "./components/Tracker";
import { loadDays } from "./days";
import { coveredAcrossDays, dayHasCardio, labelize, missingAcrossDays, musclesForDay, paintDays } from "./muscles";
import { loadDayLog, type DayLog, type SetStat } from "./trackerStore";
import type { Paint } from "./paint";
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
    cardio: dayHasCardio(day),
  }));
  const paint = paintDays(days);
  const covered = coveredAcrossDays(days);
  const missing = missingAcrossDays(days);

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
        <div className="coverage">
          <MuscleBox title="Muscles covered">
            {covered.length === 0 ? (
              <p className="muscle-empty">None</p>
            ) : (
              <ul className="muscle-dots">
                {covered.map((muscle) => (
                  <li key={muscle.name}>
                    <span className="swatch" style={{ background: muscle.color }} />
                    {labelize(muscle.name)}
                  </li>
                ))}
              </ul>
            )}
          </MuscleBox>
          <MuscleBox title="Muscles missing">
            {missing.length === 0 ? (
              <p className="muscle-empty">None - full coverage</p>
            ) : (
              <p className="muscle-missing">{missing.map((name) => labelize(name)).join(", ")}</p>
            )}
          </MuscleBox>
        </div>
      </section>

      <section className="section" aria-labelledby="last-heading">
        <h2 id="last-heading">Last workout</h2>
        <div className="last-list">
          {cards.map((card) => (
            <LastCard
              key={card.day.id}
              name={card.day.name}
              color={card.day.color}
              muscles={card.muscles.names}
              cardio={card.cardio}
              log={card.log}
              paint={paintDays([card.day])}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function filledSets(sets: SetStat[]): SetStat[] {
  return sets.filter((set) => set.weight.trim() !== "" || set.reps.trim() !== "");
}

function setLine(sets: SetStat[]): string {
  return filledSets(sets)
    .map((set) => `${set.weight}×${set.reps}`)
    .join(", ");
}

function LastCard({
  name,
  color,
  muscles,
  cardio,
  log,
  paint,
}: {
  name: string;
  color: string;
  muscles: string[];
  cardio: boolean;
  log: DayLog;
  paint: Paint;
}) {
  const entries = Object.entries(log.book).filter(([, record]) => filledSets(record.sets).length > 0);
  return (
    <article className="last-card" style={{ borderLeftColor: color }}>
      <h3>{name}</h3>
      <div className="last-figure">
        <Figure paint={paint} height={150} label={`${name} muscles`} />
      </div>
      <MuscleBox title="Muscles covered">
        {muscles.length === 0 ? (
          <p className="muscle-empty">None</p>
        ) : (
          <ul className="muscle-dots">
            {muscles.map((muscle) => (
              <li key={muscle}>
                <span className="swatch" style={{ background: color }} />
                {labelize(muscle)}
              </li>
            ))}
          </ul>
        )}
      </MuscleBox>
      {cardio ? <p className="heart-line">Heart & lungs</p> : null}
      {entries.length === 0 ? (
        <p className="last-empty">No exercise recorded</p>
      ) : (
        <>
          {log.loggedAt ? <p className="last-date">{formatWhen(log.loggedAt)}</p> : null}
          <ul className="last-session">
            {entries.map(([exercise, record]) => (
              <li key={exercise}>
                <span className="last-name">{exercise}</span>
                <span className="last-sets">{setLine(record.sets)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function MuscleBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="muscle-box">
      <p className="muscle-box-title">{title}</p>
      {children}
    </div>
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
