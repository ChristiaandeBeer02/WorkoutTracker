import { useEffect, useMemo, useState } from "react";
import {
  CATALOGUE_EQUIPMENT,
  CATALOGUE_MUSCLES,
  EXERCISE_CATALOGUE,
  catalogueByName,
  exerciseImageUrl,
  exerciseIsCardio,
  labelize,
  type CatalogueExercise,
} from "../exercises";
import { loadDays } from "../days";
import { Figure } from "./Figure";
import { paintExercise } from "../muscles";
import { appendExerciseToDay, cardsForDay, loadTrackerDay } from "../trackerStore";

type DayFilter = string;

interface Row {
  key: string;
  name: string;
  exercise: CatalogueExercise | null;
}

function muscleText(exercise: CatalogueExercise, kind: "primaryMuscles" | "secondaryMuscles"): string {
  const names = exercise[kind];
  if (names.length === 0) return "None";
  return names.map(labelize).join(", ");
}

function matchesMuscle(exercise: CatalogueExercise | null, muscle: string): boolean {
  if (muscle === "all") return true;
  if (!exercise) return false;
  return exercise.primaryMuscles.includes(muscle) || exercise.secondaryMuscles.includes(muscle);
}

function matchesEquipment(exercise: CatalogueExercise | null, equipment: string): boolean {
  if (equipment === "all") return true;
  if (!exercise) return false;
  return (exercise.equipment ?? "") === equipment;
}

export function ExercisePage() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [day, setDay] = useState<DayFilter>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [addDay, setAddDay] = useState(loadTrackerDay);
  const days = loadDays();
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source: Row[] =
      day === "all"
        ? EXERCISE_CATALOGUE.map((exercise) => ({
            key: exercise.id,
            name: exercise.name,
            exercise,
          }))
        : cardsForDay(day).map((card, index) => ({
            key: `${day}:${card.id}:${index}`,
            name: card.name.trim() || "Untitled",
            exercise: catalogueByName(card.name) ?? null,
          }));

    return source.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      if (!matchesMuscle(row.exercise, muscle)) return false;
      if (!matchesEquipment(row.exercise, equipment)) return false;
      return true;
    });
  }, [query, muscle, equipment, day, revision]);

  const open = rows.find((row) => row.key === openKey) ?? null;

  useEffect(() => {
    const state = history.state as { exerciseDetail?: boolean } | null;
    if (state?.exerciseDetail) history.replaceState(null, "");
    const onPop = () => {
      const next = history.state as { exerciseDetail?: boolean } | null;
      if (!next?.exerciseDetail) {
        setOpenKey(null);
        setNotice("");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function openExercise(key: string) {
    setOpenKey(key);
    setNotice("");
    const state = history.state as { exerciseDetail?: boolean } | null;
    if (state?.exerciseDetail) history.replaceState({ exerciseDetail: true }, "");
    else history.pushState({ exerciseDetail: true }, "");
  }

  function requestBack() {
    const state = history.state as { exerciseDetail?: boolean } | null;
    if (state?.exerciseDetail) {
      history.back();
      return;
    }
    setOpenKey(null);
    setNotice("");
  }

  function addOpenToDay() {
    if (!open) return;
    appendExerciseToDay(addDay, open.name);
    setRevision((value) => value + 1);
    const label = days.find((item) => item.id === addDay)?.name ?? "that day";
    setNotice(`Added to ${label}`);
  }

  return (
    <main className="page">
      {open ? (
        <ExerciseDetail
          key={open.key}
          row={open}
          addDay={addDay}
          notice={notice}
          days={days}
          onAddDay={setAddDay}
          onAdd={addOpenToDay}
          onBack={requestBack}
        />
      ) : (
        <>
          <h1>Exercise</h1>
          <label className="ex-search">
            <span className="sr-only">Search exercises</span>
            <input
              value={query}
              placeholder="Search"
              onChange={(event) => setQuery(event.target.value)}
              enterKeyHint="search"
            />
          </label>
          <div className="ex-filters">
            <label>
              Muscle
              <select value={muscle} onChange={(event) => setMuscle(event.target.value)}>
                <option value="all">All</option>
                {CATALOGUE_MUSCLES.map((item) => (
                  <option key={item} value={item}>
                    {labelize(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Equipment
              <select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
                <option value="all">All</option>
                {CATALOGUE_EQUIPMENT.map((item) => (
                  <option key={item} value={item}>
                    {labelize(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Day
              <select
                value={day}
                onChange={(event) => {
                  setDay(event.target.value as DayFilter);
                  setOpenKey(null);
                }}
              >
                <option value="all">All</option>
                {days.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="ex-count">
            {rows.length} {rows.length === 1 ? "exercise" : "exercises"}
          </p>
          {rows.length === 0 ? (
            <p className="ex-empty">No exercises match.</p>
          ) : (
            <ul className="ex-list">
              {rows.map((row) => (
                <li key={row.key}>
                  <button type="button" onClick={() => openExercise(row.key)}>
                    <span className="ex-list-name">{row.name}</span>
                    <span className="ex-list-meta">
                      {row.exercise
                        ? row.exercise.primaryMuscles.map(labelize).join(", ") || labelize(row.exercise.category)
                        : "On this day"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function ExerciseDetail({
  row,
  addDay,
  notice,
  days,
  onAddDay,
  onAdd,
  onBack,
}: {
  row: Row;
  addDay: string;
  notice: string;
  days: Array<{ id: string; name: string }>;
  onAddDay: (day: string) => void;
  onAdd: () => void;
  onBack: () => void;
}) {
  const exercise = row.exercise;
  const [imageFailed, setImageFailed] = useState(false);
  const photo = exercise?.images[0];

  return (
    <article className="ex-detail">
      <button type="button" className="text-back" onClick={onBack}>
        ‹ Back
      </button>
      <h2>{row.name}</h2>
      {exerciseIsCardio(row.name) ? <p className="heart-line">Heart & lungs</p> : null}
      {exercise ? (
        <>
          <p className="ex-detail-meta">
            {labelize(exercise.level)} · {exercise.equipment ? labelize(exercise.equipment) : "No equipment"} ·{" "}
            {labelize(exercise.category)}
          </p>
          <p>
            <strong>Primary.</strong> {muscleText(exercise, "primaryMuscles")}
          </p>
          <p>
            <strong>Secondary.</strong> {muscleText(exercise, "secondaryMuscles")}
          </p>
          <div className="ex-figure">
            <Figure paint={paintExercise(exercise)} height={210} label={`${row.name} muscles`} />
          </div>
          {photo ? (
            imageFailed ? (
              <p className="ex-photo-miss">Photo unavailable offline.</p>
            ) : (
              <img
                className="ex-photo"
                src={exerciseImageUrl(photo)}
                alt=""
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            )
          ) : null}
          {exercise.instructions.length > 0 ? (
            <ol className="ex-steps">
              {exercise.instructions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>No instructions in the catalogue.</p>
          )}
        </>
      ) : (
        <p>The catalogue has no exercise with this exact name.</p>
      )}
      <div className="add-day">
        <label>
          Add to
          <select value={addDay} onChange={(event) => onAddDay(event.target.value)}>
            {days.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onAdd} disabled={row.name === "Untitled"}>
          Add
        </button>
      </div>
      {notice ? <p className="tracker-notice">{notice}</p> : null}
    </article>
  );
}
