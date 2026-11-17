import { useMemo, useState } from "react";
import { capitalise } from "../format";
import { startRestIfIdle } from "../restBridge";
import { TRACKER_DAYS, nextTrackerDay, trackerSlots, type DayId } from "../plan";
import {
  applySession,
  displayStat,
  loadStats,
  loadTrackerDay,
  saveStats,
  saveTrackerDay,
  type StatBook,
} from "../trackerStore";

interface Draft {
  weight: string;
  reps: string;
}

export function Tracker() {
  const [day, setDay] = useState<DayId>(loadTrackerDay);
  const [stats, setStats] = useState<StatBook>(loadStats);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
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

  function updateDraft(name: string, field: keyof Draft, value: string) {
    setDrafts((current) => {
      const prev = current[name] ?? { weight: "", reps: "" };
      return { ...current, [name]: { ...prev, [field]: value } };
    });
    setNotice("");
  }

  function submit() {
    const entries = slots.map((slot) => {
      const name = selectedName(slot.id, slot.options);
      const draft = drafts[name] ?? { weight: "", reps: "" };
      return { name, weight: draft.weight, reps: draft.reps };
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

      <div className="tracker-scroll">
        <table className="tracker-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Weight</th>
              <th>Reps</th>
              <th>-Weight</th>
              <th>-Reps</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const name = selectedName(slot.id, slot.options);
              const draft = drafts[name] ?? { weight: "", reps: "" };
              const previous = stats[name];
              return (
                <tr key={slot.id}>
                  <td>
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
                  </td>
                  <td>
                    <input
                      aria-label={`${capitalise(name)} weight`}
                      inputMode="decimal"
                      value={draft.weight}
                      onChange={(event) => updateDraft(name, "weight", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${capitalise(name)} reps`}
                      inputMode="numeric"
                      value={draft.reps}
                      onChange={(event) => {
                        const next = event.target.value;
                        const added = next.length > draft.reps.length;
                        updateDraft(name, "reps", next);
                        if (added) startRestIfIdle();
                      }}
                    />
                  </td>
                  <td className="prev">{displayStat(previous?.weight)}</td>
                  <td className="prev">{displayStat(previous?.reps)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Submit
      </button>
    </main>
  );
}
