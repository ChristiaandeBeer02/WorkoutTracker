import { useEffect, useRef, useState } from "react";
import { modalDepth, retreat, useDismissOnBack } from "../closeOnBack";
import { DAYS_CHANGED_EVENT } from "../dayShare";
import { dayById, isPlanDay, loadDays, nextDay, type TrackerDay } from "../days";
import { loadCustomExercises } from "../customExercises";
import { catalogueNameMatches } from "../exercises";
import { detailForName, ExerciseDetail } from "./ExercisePage";
import { ManageDays } from "./ManageDays";
import { startRestIfIdle } from "../restBridge";
import { trackerSlots } from "../plan";
import {
  appendExerciseToDay,
  applySession,
  displayStat,
  loadDayWorkouts,
  loadStats,
  loadTrackerDay,
  rememberedSetCount,
  saveDayWorkouts,
  saveStats,
  saveTrackerDay,
  type StatBook,
  type WorkoutCard,
} from "../trackerStore";
import {
  DRAFT_SAVE_MS,
  loadDraftBook,
  saveDraftBook,
  setDraftFlusher,
  visibleSetRows,
  withUpdatedCount,
  withUpdatedSet,
  withoutCard,
  withoutDay,
  type DraftBook,
} from "../trackerDrafts";

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
  const [draftBook, setDraftBook] = useState<DraftBook>(loadDraftBook);
  const draftRef = useRef(draftBook);
  draftRef.current = draftBook;
  const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailNotice, setDetailNotice] = useState("");
  const detailRow = detailName ? detailForName(detailName) : null;
  useDismissOnBack(confirmRemove != null, () => setConfirmRemove(null));

  useEffect(() => {
    const state = history.state as { trackerDetail?: boolean } | null;
    if (state?.trackerDetail) history.replaceState(null, "");
    const onPop = () => {
      const next = history.state as { trackerDetail?: boolean } | null;
      if (!next?.trackerDetail) {
        setDetailName(null);
        setDetailNotice("");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const latest = history.state as { trackerDetail?: boolean } | null;
      if (latest?.trackerDetail) history.back();
    };
  }, []);

  function openDetail(name: string) {
    const row = detailForName(name);
    if (!row) return;
    setDetailName(row.name);
    setDetailNotice("");
    const state = history.state as { trackerDetail?: boolean } | null;
    if (state?.trackerDetail) history.replaceState({ trackerDetail: true }, "");
    else history.pushState({ trackerDetail: true }, "");
  }

  function closeDetail() {
    const state = history.state as { trackerDetail?: boolean } | null;
    if (state?.trackerDetail || modalDepth() > 0) {
      retreat(state?.trackerDetail ? 1 : 0);
      return;
    }
    setDetailName(null);
    setDetailNotice("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => saveDraftBook(draftRef.current), DRAFT_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [draftBook]);

  useEffect(() => setDraftFlusher(() => saveDraftBook(draftRef.current)), []);

  useEffect(() => {
    const flush = () => saveDraftBook(draftRef.current);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

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
    const chosen = draftRef.current.counts[day]?.[card.id];
    if (chosen != null) return Math.max(1, chosen);
    return Math.max(1, card.sets);
  }

  function rowsFor(id: string, count: number) {
    return visibleSetRows(draftBook.sets[day]?.[id], count);
  }

  function keepDraft(next: DraftBook) {
    draftRef.current = next;
    setDraftBook(next);
  }

  function updateSet(id: string, index: number, count: number, field: "weight" | "reps", value: string) {
    keepDraft(withUpdatedSet(draftRef.current, day, id, index, count, field, value));
    setNotice("");
  }

  function changeCount(card: WorkoutCard, delta: number) {
    const next = Math.max(1, countFor(card) + delta);
    keepDraft(withUpdatedCount(draftRef.current, day, card.id, next));
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

  function moveCard(index: number, delta: -1 | 1) {
    const current = cardsFor(day);
    const target = index + delta;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    const [card] = next.splice(index, 1);
    next.splice(target, 0, card);
    replaceCards(next);
  }

  function removeWorkout(id: string) {
    const next = withoutCard(draftRef.current, day, id);
    draftRef.current = next;
    saveDraftBook(next);
    setDraftBook(next);
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
    const cleared = withoutDay(draftRef.current, day);
    draftRef.current = cleared;
    saveDraftBook(cleared);
    setDraftBook(cleared);
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
  const trackerDays = days.map((item) => ({ id: item.id, name: item.name }));

  if (detailRow) {
    return (
      <main className="page">
        <ExerciseDetail
          key={detailRow.key}
          row={detailRow}
          addDay={day}
          notice={detailNotice}
          days={trackerDays}
          onAddDay={(next) => {
            setDay(next);
            saveTrackerDay(next);
            setStats(loadStats(next));
          }}
          onAdd={() => {
            appendExerciseToDay(day, detailRow.name);
            setLists((current) => {
              const next = { ...current };
              delete next[day];
              return next;
            });
            const label = days.find((item) => item.id === day)?.name ?? "that day";
            setDetailNotice(`Added to ${label}`);
          }}
          onBack={closeDetail}
          onCustomChange={() => setDetailNotice("")}
        />
      </main>
    );
  }

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

      {cards.map((card, index) => {
        const count = countFor(card);
        const rows = rowsFor(card.id, count);
        const previous = stats[card.name.trim()]?.sets ?? [];
        const label = card.name.trim() || "Exercise";
        const suggestions = naming === card.id ? suggestionsFor(card) : [];
        return (
          <section className="set-card" key={card.id} aria-label={label}>
            <div className="set-card-main">
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
                {card.name.trim() ? (
                  <button
                    type="button"
                    className="view-details"
                    onClick={() => openDetail(card.name)}
                  >
                    View details
                  </button>
                ) : null}
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
                {rows.map((row, setIndex) => (
                  <tr key={setIndex}>
                    <td className="set-num">{setIndex + 1}</td>
                    <td>
                      <input
                        aria-label={`${label} set ${setIndex + 1} weight`}
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(event) => updateSet(card.id, setIndex, count, "weight", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${label} set ${setIndex + 1} reps`}
                        inputMode="numeric"
                        value={row.reps}
                        onChange={(event) => {
                          const next = event.target.value;
                          const added = next.length > row.reps.length;
                          updateSet(card.id, setIndex, count, "reps", next);
                          if (added) startRestIfIdle();
                        }}
                      />
                    </td>
                    <td className="prev">{displayStat(previous[setIndex]?.weight)}</td>
                    <td className="prev">{displayStat(previous[setIndex]?.reps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="reorder">
              <button
                type="button"
                aria-label={`Move ${label} up`}
                disabled={index === 0}
                onClick={() => moveCard(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${label} down`}
                disabled={index === cards.length - 1}
                onClick={() => moveCard(index, 1)}
              >
                ↓
              </button>
            </div>
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
