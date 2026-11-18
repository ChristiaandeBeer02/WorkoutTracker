import { useEffect, useState, type ReactNode } from "react";
import { BottomNav, loadAppView, saveAppView, type AppView } from "./components/BottomNav";
import { ImportDays } from "./components/ImportDays";
import { ExercisePage } from "./components/ExercisePage";
import { Figure } from "./components/Figure";
import { RestBar } from "./components/RestBar";
import { UpdateBanner } from "./components/UpdateBanner";
import { SettingsPanel } from "./components/SettingsPanel";
import { Tracker } from "./components/Tracker";
import { linkWarning, unmappedOnDay } from "./customExercises";
import { notifyDaysChanged } from "./dayShare";
import { loadDays } from "./days";
import { MapDialog } from "./components/MuscleEditor";
import { coveredAcrossDays, dayHasCardio, labelize, missingAcrossDays, musclesForDay, paintDays } from "./muscles";
import { cardsForDay, loadDayLog, type DayLog, type SetStat, type StatBook } from "./trackerStore";
import type { Paint } from "./paint";
import { useTheme } from "./theme";

export function App() {
  const [view, setView] = useState<AppView>(loadAppView);
  const [importCode, setImportCode] = useState<string | null>(null);
  const [dataRev, setDataRev] = useState(0);

  useEffect(() => {
    function takeImport() {
      const hash = window.location.hash;
      if (!hash.startsWith("#import=")) return;
      const code = decodeURIComponentSafe(hash.slice("#import=".length));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (code) setImportCode(code);
    }
    takeImport();
    window.addEventListener("hashchange", takeImport);
    return () => window.removeEventListener("hashchange", takeImport);
  }, []);

  function changeView(next: AppView) {
    setView(next);
    saveAppView(next);
  }

  function appliedImport() {
    notifyDaysChanged();
    setDataRev((value) => value + 1);
  }

  return (
    <>
      <RestBar />
      <UpdateBanner />
      {view === "home" ? <Page refresh={dataRev} /> : view === "tracker" ? <Tracker /> : <ExercisePage key={dataRev} />}
      <BottomNav view={view} onChange={changeView} />
      {importCode != null ? (
        <ImportDays initialCode={importCode} onClose={() => setImportCode(null)} onApplied={appliedImport} />
      ) : null}
    </>
  );
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Page({ refresh }: { refresh: number }) {
  void refresh;
  const { colors, setColor, resetColors } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapDayId, setMapDayId] = useState<string | null>(null);
  const [, refreshCustom] = useState(0);
  const days = loadDays();
  const cards = days.map((day) => ({
    day,
    log: loadDayLog(day.id),
    order: cardsForDay(day.id).map((item) => item.name.trim()).filter((name) => name.length > 0),
    muscles: musclesForDay(day),
    cardio: dayHasCardio(day),
    unmapped: unmappedOnDay(day),
  }));
  const mapDay = cards.find((card) => card.day.id === mapDayId) ?? null;
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
        {cards.some((card) => card.unmapped.length > 0) ? (
          <p className="map-warn">
            ⚠ No muscles linked:{" "}
            {cards
              .filter((card) => card.unmapped.length > 0)
              .map((card, index) => (
                <span key={card.day.id}>
                  {index > 0 ? ", " : null}
                  <button type="button" onClick={() => setMapDayId(card.day.id)}>
                    {card.day.name}
                  </button>
                </span>
              ))}
          </p>
        ) : null}
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
                order={card.order}
                paint={paintDays([card.day])}
                warning={card.unmapped.length > 0 ? linkWarning(card.unmapped.length, card.day.name) : ""}
                onWarn={() => setMapDayId(card.day.id)}
              />
          ))}
        </div>
      </section>
      {mapDay && mapDay.unmapped.length > 0 ? (
        <MapDialog
          dayName={mapDay.day.name}
          names={mapDay.unmapped}
          onClose={() => setMapDayId(null)}
          onSaved={() => refreshCustom((value) => value + 1)}
        />
      ) : null}
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

function sessionEntries(book: StatBook, order: readonly string[]) {
  const rank = new Map(order.map((name, index) => [name.toLowerCase(), index]));
  return Object.entries(book)
    .filter(([, record]) => filledSets(record.sets).length > 0)
    .sort(
      (a, b) =>
        (rank.get(a[0].toLowerCase()) ?? order.length) - (rank.get(b[0].toLowerCase()) ?? order.length),
    );
}

function LastCard({
  name,
  color,
  muscles,
  cardio,
  log,
  order,
  paint,
  warning,
  onWarn,
}: {
  name: string;
  color: string;
  muscles: string[];
  cardio: boolean;
  log: DayLog;
  order: string[];
  paint: Paint;
  warning: string;
  onWarn: () => void;
}) {
  const entries = sessionEntries(log.book, order);
  return (
    <article className="last-card" style={{ borderLeftColor: color }}>
      <h3>{name}</h3>
      {warning ? (
        <button type="button" className="link-warn" onClick={onWarn}>
          {warning}
        </button>
      ) : null}
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
