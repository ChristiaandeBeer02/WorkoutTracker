import { useCallback, useState } from "react";
import { BottomNav, loadAppView, saveAppView, type AppView } from "./components/BottomNav";
import { DataTable } from "./components/DataTable";
import { ExerciseSheet } from "./components/ExerciseSheet";
import { Figure } from "./components/Figure";
import { SettingsPanel } from "./components/SettingsPanel";
import { OPACITY, type DayKey } from "./colors";
import {
  CARDIO_LEGS,
  CARDIO_TABLE,
  CORE_SET,
  CORE_TABLE,
  EXERCISES,
  LEGS,
  LEGS_TABLE,
  PULL,
  PULL_TABLE,
  PUSH,
  PUSH_TABLE,
  type DayId,
} from "./plan";
import { paintAll, type Paint } from "./paint";
import { RestBar } from "./components/RestBar";
import { Tracker } from "./components/Tracker";
import { useTheme } from "./theme";

const SPLIT: Array<{ id: string; day: DayKey; label: string; detail: string }> = [
  { id: "legs", day: "legs", label: "Legs", detail: "Quads, glutes, hamstrings, calves" },
  { id: "push", day: "push", label: "Push", detail: "Chest, shoulders, triceps" },
  { id: "cardio", day: "cardioCore", label: "Cardio", detail: "Heart and lungs" },
  { id: "pull", day: "pull", label: "Pull", detail: "Back, rear shoulders, biceps" },
];

function dayColor(colors: Record<DayKey, string>, day: DayId): string {
  if (day === "cardio") return colors.cardioCore;
  return colors[day];
}

export function App() {
  const [view, setView] = useState<AppView>(loadAppView);

  function changeView(next: AppView) {
    setView(next);
    saveAppView(next);
  }

  return (
    <>
      <RestBar />
      {view === "home" ? <Page /> : <Tracker />}
      <BottomNav view={view} onChange={changeView} />
    </>
  );
}

function Page() {
  const { colors, setColor, resetColors } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const open = useCallback((name: string) => setSelected(name), []);
  const close = useCallback(() => setSelected(null), []);

  const overview: Paint = {
    ...paintAll(CORE_SET, colors.cardioCore, OPACITY.primary),
    ...paintAll(PUSH, colors.push, OPACITY.primary),
    ...paintAll(PULL, colors.pull, OPACITY.primary),
    ...paintAll(LEGS, colors.legs, OPACITY.primary),
  };

  const info = selected ? EXERCISES[selected] : undefined;
  const popupPaint: Paint = info
    ? {
        ...paintAll(info.secondary, dayColor(colors, info.day), OPACITY.secondary),
        ...paintAll(info.primary, dayColor(colors, info.day), OPACITY.primary),
      }
    : {};

  return (
    <main className="page">
      <header className="mast">
        <h1>Workouts</h1>
        <p className="summary">
          Your legs, push, cardio and pull sessions, grouped by day. Free weights first, machines
          if you need them.
        </p>
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

      <section className="section" id="muscles" aria-labelledby="muscles-heading">
        <h2 id="muscles-heading">Muscles you cover</h2>
        <div className="legend">
          <LegendItem label="Push" color={colors.push} />
          <LegendItem label="Pull" color={colors.pull} />
          <LegendItem label="Legs" color={colors.legs} />
          <LegendItem label="Cardio + Core" color={colors.cardioCore} />
        </div>
        <div className="figure">
          <Figure paint={overview} label="Muscles the plan covers, front and back" />
        </div>
        <p>Tap any exercise name below, fallbacks included, to see the muscles it works.</p>
        <p className="credit">
          Muscle figures:{" "}
          <a href="https://github.com/Jsplice/MuscleMap" target="_blank" rel="noreferrer">
            MuscleMap
          </a>{" "}
          by Jsplice and contributors, MIT licence.
        </p>
      </section>

      <section className="section" id="split" aria-labelledby="split-heading">
        <h2 id="split-heading">Your split</h2>
        <div className="split">
          {SPLIT.map((item, index) => (
            <div key={item.id} className="split-step">
              {index > 0 ? (
                <span className="split-arrow" aria-hidden="true">
                  ↓
                </span>
              ) : null}
              <a className="split-card" href={`#${item.id}`} style={{ borderLeftColor: colors[item.day] }}>
                <span className="split-label">{item.label}</span>
                <span className="split-detail">{item.detail}</span>
              </a>
            </div>
          ))}
        </div>
        <p>
          The four days run in that order. Pick a weight where the last two or three reps feel
          tough but clean, and rest about 90 seconds between sets.
        </p>
        <aside className="callout">
          <strong>How to pick a weight</strong>
          <p>
            If you sail past 12 reps, go heavier next set. If you cannot hit about 8, go lighter.
            On cardio, easy means you can speak in sentences; hard means only a few words. Skip
            any move that pinches or hurts sharply.
          </p>
        </aside>
      </section>

      <DaySection
        id="legs"
        heading="Legs"
        paint={paintAll(LEGS, colors.legs, OPACITY.primary)}
        caption="This day covers quads, hamstrings, glutes, inner thighs, outer hips, and calves."
        table={LEGS_TABLE}
        onOpen={open}
        intro="These moves train the muscles that squat, hinge, and push the ground away: quads, glutes, hamstrings, and calves."
        warmup={["Leg swings, 10 each way", "Bodyweight squats, 10", "Empty-bar squat, 8–10", "Light Romanian deadlift, 8"]}
        closing="Optional finisher: leg extensions or hip thrusts, 2 sets of 10–15."
      />

      <DaySection
        id="push"
        heading="Push"
        paint={paintAll(PUSH, colors.push, OPACITY.primary)}
        caption="This day covers chest, front and side shoulders, and triceps."
        table={PUSH_TABLE}
        onOpen={open}
        intro="These moves train the muscles that press away from you: chest, the front of the shoulders, and triceps."
        warmup={[
          "Arm circles, 10 each way",
          "Scapular push-ups or easy push-ups, 8–10",
          "Empty-bar or very light dumbbell bench press, 8–10",
          "Light overhead press, 8",
        ]}
        closing="Optional finisher: cable tricep pushdowns or an overhead dumbbell tricep extension, 2 sets of 10–15."
      />

      <section className="section" id="cardio" aria-labelledby="cardio-heading">
        <h2 id="cardio-heading">Cardio + Core</h2>
        <DayFigure
          paint={{
            ...paintAll(CARDIO_LEGS, colors.cardioCore, OPACITY.cardioLegs),
            ...paintAll(CORE_SET, colors.cardioCore, OPACITY.primary),
          }}
          caption="This day is mainly for the heart and lungs. The legs drive the machine, so they are shown faintly. The core block afterwards covers abs and obliques."
        />
        <DataTable table={CARDIO_TABLE} onOpen={open} />
        <p>
          This day is for the heart and lungs, not a lifting session. Start the first five minutes
          very easy before you settle into steady work or intervals.
        </p>
        <Warmup
          items={[
            "5 minutes very easy on the machine you will use",
            "A few light joint circles if anything feels stiff",
          ]}
        />
        <p>
          Pick either the easy steady session or the intervals as your main work, then finish with
          the cool-down. You do not need both hard pieces on the same day.
        </p>
        <p className="subhead">Core block, after the cardio (about 10–15 minutes):</p>
        <DataTable table={CORE_TABLE} onOpen={open} />
      </section>

      <DaySection
        id="pull"
        heading="Pull"
        paint={paintAll([...PULL, "CORE"], colors.pull, OPACITY.primary)}
        caption="This day covers lats, mid-back, traps, rear shoulders, biceps, forearms, lower back, and abs."
        table={PULL_TABLE}
        onOpen={open}
        intro="These moves train the muscles that pull toward you: the back, rear shoulders, and biceps."
        warmup={[
          "Arm circles, 10 each way",
          "Light face pulls, 10",
          "An easy hang from the bar or a light lat pulldown, 8",
          "Light row, 8",
        ]}
        closing="Optional finisher: straight-arm pulldowns or another easy curl set, 2 sets of 10–15."
      />

      {selected && info ? (
        <ExerciseSheet name={selected} info={info} paint={popupPaint} onClose={close} />
      ) : null}
    </main>
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

function DayFigure({ paint, caption }: { paint: Paint; caption: string }) {
  return (
    <>
      <div className="figure">
        <Figure paint={paint} />
      </div>
      <p className="caption">{caption}</p>
    </>
  );
}

function Warmup({ items }: { items: string[] }) {
  return (
    <>
      <p>Warm-up before the main work:</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

function DaySection({
  id,
  heading,
  paint,
  caption,
  table,
  onOpen,
  intro,
  warmup,
  closing,
}: {
  id: string;
  heading: string;
  paint: Paint;
  caption: string;
  table: typeof LEGS_TABLE;
  onOpen: (name: string) => void;
  intro: string;
  warmup: string[];
  closing: string;
}) {
  return (
    <section className="section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{heading}</h2>
      <DayFigure paint={paint} caption={caption} />
      <DataTable table={table} onOpen={onOpen} />
      <p>{intro}</p>
      <Warmup items={warmup} />
      <p>{closing}</p>
    </section>
  );
}
