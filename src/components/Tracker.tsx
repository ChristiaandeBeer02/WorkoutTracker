import { useMemo, useState } from "react";
import { capitalise } from "../format";
import { startRestIfIdle } from "../restBridge";
import { TRACKER_DAYS, nextTrackerDay, trackerSlots, type DayId } from "../plan";
import {
  applySession,
  displayStat,
  loadStats,
  loadTrackerDay,
  rememberedSetCount,
  saveStats,
  saveTrackerDay,
  type SetStat,
  type StatBook,
} from "../trackerStore";

const EMPTY_SET: SetStat = { weight: "", reps: "" };

export function Tracker() {
  const [day, setDay] = useState<DayId>(loadTrackerDay);
  const [stats, setStats] = useState<StatBook>(loadStats);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, SetStat[]>>({});
  const [notice, setNotice] = useState("");
  const slots = useMemo(() => trackerSlots(day), [day]);

  function chooseDay(next: DayId) {
    setDay(next);
    saveTrackerDay(next);
    setNotice("");
  }

  function selectedName(slotId: string, options: string[]): string {
    const picked = choice[slotId];
    return picked && options.includes(picked) ? picked : options[0];
  }

  function countFor(name: string, planSets: number): number {
    const chosen = counts[name];
    if (chosen != null) return Math.max(1, chosen);
    return rememberedSetCount(stats[name], planSets);
  }

  function rowsFor(name: string, count: number): SetStat[] {
    const draft = drafts[name] ?? [];
    return Array.from({ length: count }, (_, index) => draft[index] ?? EMPTY_SET);
  }

  function updateSet(name: string, index: number, count: number, field: keyof SetStat, value: string) {
    setDrafts((current) => {
      const rows = Array.from({ length: count }, (_, row) => current[name]?.[row] ?? EMPTY_SET);
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, [name]: rows };
    });
    setNotice("");
  }

  function changeCount(name: string, planSets: number, delta: number) {
    const next = Math.max(1, countFor(name, planSets) + delta);
    setCounts((current) => ({ ...current, [name]: next }));
  }

  function submit() {
    const entries = slots.map((slot) => {
      const name = selectedName(slot.id, slot.options);
      const count = countFor(name, slot.sets);
      return { name, sets: rowsFor(name, count) };
    });
    const result = applySession(stats, entries);
    saveStats(result.book);
    setStats(result.book);
    setDrafts((current) => {
      const next = { ...current };
      for (const slot of slots) {
        for (const name of slot.options) delete next[name];
      }
      return next;
    });
    setCounts((current) => {
      const next = { ...current };
      for (const entry of entries) {
        if (result.book[entry.name] !== stats[entry.name]) delete next[entry.name];
      }
      return next;
    });
    const finished = TRACKER_DAYS.find((item) => item.id === day) ?? TRACKER_DAYS[0];
    const upcoming = nextTrackerDay(day);
    setDay(upcoming.id);
    saveTrackerDay(upcoming.id);
    setNotice(
      result.saved === 0
        ? `Nothing new to save. Next up: ${upcoming.label}`
        : `Saved ${finished.label}. Next up: ${upcoming.label}`,
    );
  }

  return (
    <main className="page">
      <h1>Tracker</h1>
      <label className="day-picker">
        <span>Day</span>
        <select
          aria-label="Exercise day"
          value={day}
          onChange={(event) => chooseDay(event.target.value as DayId)}
        >
          {TRACKER_DAYS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {notice ? (
        <p className="tracker-notice" role="status">
          {notice}
        </p>
      ) : null}

      {slots.map((slot) => {
        const name = selectedName(slot.id, slot.options);
        const count = countFor(name, slot.sets);
        const rows = rowsFor(name, count);
        const previous = stats[name]?.sets ?? [];
        return (
          <section className="set-card" key={slot.id} aria-label={capitalise(name)}>
            <header className="set-card-head">
              <div className="ex-pick">
                <span className="ex-pick-label">{capitalise(name)}</span>
                <select
                  aria-label={`Exercise, ${capitalise(slot.options[0])}`}
                  title={capitalise(name)}
                  value={name}
                  onChange={(event) =>
                    setChoice((current) => ({ ...current, [slot.id]: event.target.value }))
                  }
                >
                  {slot.options.map((option) => (
                    <option key={option} value={option}>
                      {capitalise(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="set-actions">
                <button type="button" onClick={() => changeCount(name, slot.sets, 1)}>
                  + set
                </button>
                <button
                  type="button"
                  onClick={() => changeCount(name, slot.sets, -1)}
                  disabled={count <= 1}
                >
                  - set
                </button>
              </div>
            </header>
            <table className="set-table">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Weight</th>
                  <th>Reps</th>
                  <th>-Weight</th>
                  <th>-Reps</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="set-num">{index + 1}</td>
                    <td>
                      <input
                        aria-label={`${capitalise(name)} set ${index + 1} weight`}
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(event) => updateSet(name, index, count, "weight", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${capitalise(name)} set ${index + 1} reps`}
                        inputMode="numeric"
                        value={row.reps}
                        onChange={(event) => {
                          const next = event.target.value;
                          const added = next.length > row.reps.length;
                          updateSet(name, index, count, "reps", next);
                          if (added) startRestIfIdle();
                        }}
                      />
                    </td>
                    <td className="prev">{displayStat(previous[index]?.weight)}</td>
                    <td className="prev">{displayStat(previous[index]?.reps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Submit
      </button>
    </main>
  );
}
