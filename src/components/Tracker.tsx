import { useEffect, useState } from "react";
import { useDismissOnBack } from "../closeOnBack";
import { DAYS_CHANGED_EVENT } from "../dayShare";
import { dayById, isPlanDay, loadDays, nextDay, type TrackerDay } from "../days";
import { loadCustomExercises } from "../customExercises";
import { catalogueNameMatches } from "../exercises";
import { ManageDays } from "./ManageDays";
import { startRestIfIdle } from "../restBridge";
import { trackerSlots } from "../plan";
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

function planCards(day: string, book: StatBook): WorkoutCard[] {
  if (!isPlanDay(day)) {
    return [freshCard()];
  }
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
  const [days, setDays] = useState<TrackerDay[]>(loadDays);
  const [day, setDay] = useState(loadTrackerDay);
  const [stats, setStats] = useState<StatBook>(() => loadStats(loadTrackerDay()));
  const [lists, setLists] = useState<Partial<Record<string, WorkoutCard[]>>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, SetStat[]>>({});
  const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  useDismissOnBack(confirmRemove != null, () => setConfirmRemove(null));

  function cardsFor(target: string, book: StatBook = stats): WorkoutCard[] {
    return lists[target] ?? loadDayWorkouts(target) ?? planCards(target, book);
  }

  function replaceCards(next: WorkoutCard[]) {
    setLists((current) => ({ ...current, [day]: next }));
    saveDayWorkouts(day, next);
    setNotice("");
    setConfirmRemove(null);
  }

  function chooseDay(next: string) {
    setDay(next);
    setStats(loadStats(next));
    saveTrackerDay(next);
    setNotice("");
    setConfirmRemove(null);
  }

  useEffect(() => {
    const onChange = () => refreshDays();
    window.addEventListener(DAYS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DAYS_CHANGED_EVENT, onChange);
  }, [day]);

  function refreshDays() {
    const next = loadDays();
    setDays(next);
    setLists({});
    if (!next.some((item) => item.id === day)) {
      const fallback = next[0];
      setDay(fallback.id);
      saveTrackerDay(fallback.id);
      setStats(loadStats(fallback.id));
    } else {
      setStats(loadStats(day));
    }
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

  function suggestionsFor(card: WorkoutCard): string[] {
    const query = card.name.trim().toLowerCase();
    if (!query) return [];
    const seen = new Set<string>();
    const matches: string[] = [];
    const consider = (raw: string) => {
      const name = raw.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key) || key === query || !key.includes(query)) return;
      seen.add(key);
      matches.push(name);
    };
    for (const option of card.options) consider(option);
    for (const name of Object.keys(stats)) consider(name);
    for (const item of loadCustomExercises()) consider(item.name);
    for (const name of catalogueNameMatches(query, seen)) matches.push(name);
    return matches;
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
    saveStats(day, result.book, result.saved > 0 ? new Date().toISOString() : undefined);
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
    const finished = dayById(days, day);
    const upcoming = nextDay(days, day);
    setDay(upcoming.id);
    saveTrackerDay(upcoming.id);
    setStats(loadStats(upcoming.id));
    setConfirmRemove(null);
    setNotice(
      result.saved === 0
        ? `Nothing new to save. Next up: ${upcoming.name}`
        : `Saved ${finished.name}. Next up: ${upcoming.name}`,
    );
  }

  const cards = cardsFor(day);

  return (
    <main className="page">
      <h1>Tracker</h1>
      <div className="day-picker">
        <label>
          <span>Day</span>
          <select aria-label="Exercise day" value={day} onChange={(event) => chooseDay(event.target.value)}>
            {days.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="manage-open" onClick={() => setManaging(true)}>
          Manage days
        </button>
      </div>
      {managing ? <ManageDays onChange={refreshDays} onClose={() => setManaging(false)} /> : null}
      {notice ? (
        <p className="tracker-notice" role="status">
          {notice}
        </p>
      ) : null}

      {cards.map((card) => {
        const count = countFor(card);
        const rows = rowsFor(card.id, count);
        const previous = stats[card.name.trim()]?.sets ?? [];
        const label = card.name.trim() || "Exercise";
        const suggestions = naming === card.id ? suggestionsFor(card) : [];
        return (
          <section className="set-card" key={card.id} aria-label={label}>
            <header className="set-card-head">
              <div className="ex-name">
                <input
                  aria-label={`Exercise name, ${label}`}
                  aria-autocomplete="list"
                  aria-expanded={suggestions.length > 0}
                  placeholder="Exercise"
                  value={card.name}
                  onFocus={() => setNaming(card.id)}
                  onBlur={() => setNaming((current) => (current === card.id ? null : current))}
                  onChange={(event) => {
                    rename(card.id, event.target.value);
                    setNaming(card.id);
                  }}
                />
                {suggestions.length > 0 ? (
                  <ul className="ex-suggest" role="listbox">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          role="option"
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={() => {
                            rename(card.id, suggestion);
                            setNaming(null);
                          }}
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
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
