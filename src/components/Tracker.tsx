import { useState } from "react";
import { startRestIfIdle } from "../restBridge";
import { TRACKER_DAYS, nextTrackerDay, trackerSlots, type DayId } from "../plan";
import {
  applySession,
  displayStat,
  loadDayWorkouts,
  loadStats,
  loadTrackerDay,
  rememberedSetCount,
  saveDayWorkouts,
  saveStats,
  saveTrackerDay,
  type SetStat,
  type StatBook,
  type WorkoutCard,
} from "../trackerStore";

const EMPTY_SET: SetStat = { weight: "", reps: "" };

function planCards(day: DayId, book: StatBook): WorkoutCard[] {
  return trackerSlots(day).map((slot) => ({
    id: slot.id,
    name: slot.options[0],
    options: slot.options,
    sets: rememberedSetCount(book[slot.options[0]], slot.sets),
  }));
}

function freshCard(): WorkoutCard {
  return {
    id: `added-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    options: [],
    sets: 3,
  };
}

export function Tracker() {
  const [day, setDay] = useState<DayId>(loadTrackerDay);
  const [stats, setStats] = useState<StatBook>(loadStats);
  const [lists, setLists] = useState<Partial<Record<DayId, WorkoutCard[]>>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, SetStat[]>>({});
  const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  function cardsFor(target: DayId, book: StatBook = stats): WorkoutCard[] {
    return lists[target] ?? loadDayWorkouts(target) ?? planCards(target, book);
  }

  function replaceCards(next: WorkoutCard[]) {
    setLists((current) => ({ ...current, [day]: next }));
    setNotice("");
    setConfirmRemove(null);
  }

  function chooseDay(next: DayId) {
    setDay(next);
    saveTrackerDay(next);
    setNotice("");
    setConfirmRemove(null);
  }

  function countFor(card: WorkoutCard): number {
    const chosen = counts[card.id];
    if (chosen != null) return Math.max(1, chosen);
    return Math.max(1, card.sets);
  }

  function rowsFor(id: string, count: number): SetStat[] {
    const draft = drafts[id] ?? [];
    return Array.from({ length: count }, (_, index) => draft[index] ?? EMPTY_SET);
  }

  function updateSet(id: string, index: number, count: number, field: keyof SetStat, value: string) {
    setDrafts((current) => {
      const rows = Array.from({ length: count }, (_, row) => current[id]?.[row] ?? EMPTY_SET);
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, [id]: rows };
    });
    setNotice("");
  }

  function changeCount(card: WorkoutCard, delta: number) {
    setCounts((current) => ({ ...current, [card.id]: Math.max(1, countFor(card) + delta) }));
    setConfirmRemove(null);
  }

  function rename(id: string, name: string) {
    replaceCards(cardsFor(day).map((card) => (card.id === id ? { ...card, name } : card)));
  }

  function addWorkout() {
    replaceCards([...cardsFor(day), freshCard()]);
  }

  function removeWorkout(id: string) {
    replaceCards(cardsFor(day).filter((card) => card.id !== id));
  }

  function submit() {
    const cards = cardsFor(day).map((card) => ({
      ...card,
      name: card.name.trim(),
      sets: countFor(card),
    }));
    const entries = cards
      .filter((card) => card.name.length > 0)
      .map((card) => ({ name: card.name, sets: rowsFor(card.id, card.sets) }));
    const result = applySession(stats, entries);
    saveStats(result.book);
    setStats(result.book);
    saveDayWorkouts(day, cards);
    setLists((current) => ({ ...current, [day]: cards }));
    setDrafts((current) => {
      const next = { ...current };
      for (const card of cards) delete next[card.id];
      return next;
    });
    setCounts((current) => {
      const next = { ...current };
      for (const card of cards) delete next[card.id];
      return next;
    });
    const finished = TRACKER_DAYS.find((item) => item.id === day) ?? TRACKER_DAYS[0];
    const upcoming = nextTrackerDay(day);
    setDay(upcoming.id);
    saveTrackerDay(upcoming.id);
    setConfirmRemove(null);
    setNotice(
      result.saved === 0
        ? `Nothing new to save. Next up: ${upcoming.label}`
        : `Saved ${finished.label}. Next up: ${upcoming.label}`,
    );
  }

  const cards = cardsFor(day);

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

      {cards.map((card) => {
        const count = countFor(card);
        const rows = rowsFor(card.id, count);
        const previous = stats[card.name.trim()]?.sets ?? [];
        const listId = `picks-${card.id.replace(/[^a-z0-9_-]/gi, "-")}`;
        const label = card.name.trim() || "Exercise";
        return (
          <section className="set-card" key={card.id} aria-label={label}>
            <header className="set-card-head">
              <div className={card.options.length > 0 ? "ex-name has-picks" : "ex-name"}>
                <input
                  aria-label={`Exercise name, ${label}`}
                  placeholder="Exercise"
                  value={card.name}
                  list={card.options.length > 0 ? listId : undefined}
                  onChange={(event) => rename(card.id, event.target.value)}
                />
                {card.options.length > 0 ? (
                  <datalist id={listId}>
                    {card.options.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                ) : null}
              </div>
              <div className="set-actions">
                <button type="button" onClick={() => changeCount(card, 1)}>
                  + set
                </button>
                <button type="button" onClick={() => changeCount(card, -1)} disabled={count <= 1}>
                  - set
                </button>
              </div>
            </header>
            <button
              type="button"
              className={confirmRemove === card.id ? "remove-workout confirm" : "remove-workout"}
              onClick={() => {
                if (confirmRemove === card.id) removeWorkout(card.id);
                else setConfirmRemove(card.id);
              }}
            >
              {confirmRemove === card.id ? "Remove?" : "Remove"}
            </button>
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
                        aria-label={`${label} set ${index + 1} weight`}
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(event) => updateSet(card.id, index, count, "weight", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${label} set ${index + 1} reps`}
                        inputMode="numeric"
                        value={row.reps}
                        onChange={(event) => {
                          const next = event.target.value;
                          const added = next.length > row.reps.length;
                          updateSet(card.id, index, count, "reps", next);
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

      <button type="button" className="btn btn-quiet btn-block" onClick={addWorkout}>
        Add workout
      </button>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Submit
      </button>
    </main>
  );
}
