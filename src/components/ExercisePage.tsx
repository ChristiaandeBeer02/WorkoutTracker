import { useEffect, useMemo, useState } from "react";
import { modalDepth, retreat, useDismissOnBack } from "../closeOnBack";
import {
  CATALOGUE_EQUIPMENT,
  CATALOGUE_MUSCLES,
  EXERCISE_CATALOGUE,
  catalogueByName,
  exerciseImageUrl,
  labelize,
  type CatalogueExercise,
} from "../exercises";
import {
  CUSTOM_CHANGED_EVENT,
  customByName,
  deleteCustomExercise,
  loadCustomExercises,
  saveCustomExercise,
  type CustomExercise,
} from "../customExercises";
import { normaliseExerciseName } from "../exercises";
import { searchByName, searchKey } from "../exerciseSearch";
import { loadDays } from "../days";
import { Figure } from "./Figure";
import { MuscleEditor } from "./MuscleEditor";
import { nameTrainsCardio, paintExercise, paintWorked } from "../muscles";
import { appendExerciseToDay, loadTrackerDay } from "../trackerStore";

export interface ExerciseDetailRow {
  key: string;
  name: string;
  exercise: CatalogueExercise | null;
  custom: CustomExercise | null;
}

export function detailForName(name: string): ExerciseDetailRow | null {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  const exercise = catalogueByName(cleaned) ?? null;
  const custom = exercise ? null : (customByName(cleaned) ?? null);
  return {
    key: exercise?.id ?? `custom:${normaliseExerciseName(cleaned)}`,
    name: exercise?.name ?? custom?.name ?? cleaned,
    exercise,
    custom,
  };
}

function muscleText(exercise: CatalogueExercise, kind: "primaryMuscles" | "secondaryMuscles"): string {
  const names = exercise[kind];
  if (names.length === 0) return "None";
  return names.map(labelize).join(", ");
}

function matchesEquipment(exercise: CatalogueExercise | null, equipment: string): boolean {
  if (equipment === "all") return true;
  if (!exercise) return false;
  return (exercise.equipment ?? "") === equipment;
}

export function ExercisePage() {
  const [query, setQuery] = useState("");
  const [mainMuscle, setMainMuscle] = useState("all");
  const [secondaryMuscle, setSecondaryMuscle] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [list, setList] = useState<"all" | "custom">("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [addDay, setAddDay] = useState(loadTrackerDay);
  const days = loadDays();
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const customRows: ExerciseDetailRow[] = loadCustomExercises().map((item) => ({
      key: `custom:${normaliseExerciseName(item.name)}`,
      name: item.name,
      exercise: null,
      custom: item,
    }));
    const catalogueRows: ExerciseDetailRow[] = EXERCISE_CATALOGUE.map((exercise) => ({
      key: exercise.id,
      name: exercise.name,
      exercise,
      custom: null,
    }));
    const source: ExerciseDetailRow[] = list === "custom" ? customRows : [...customRows, ...catalogueRows];

    const order = needle
      ? new Map(searchByName(needle, { universe: source.map((row) => row.name) }).map((name, index) => [searchKey(name), index]))
      : null;

    return source
      .filter((row) => {
        if (order && !order.has(searchKey(row.name))) return false;
        if (mainMuscle !== "all") {
          const worked = row.exercise?.primaryMuscles ?? row.custom?.muscles ?? [];
          if (!worked.includes(mainMuscle)) return false;
        }
        if (secondaryMuscle !== "all") {
          if (!row.exercise?.secondaryMuscles.includes(secondaryMuscle)) return false;
        }
        if (row.custom) return equipment === "all";
        if (!matchesEquipment(row.exercise, equipment)) return false;
        return true;
      })
      .sort((a, b) => {
        if (!order) return 0;
        return (order.get(searchKey(a.name)) ?? 0) - (order.get(searchKey(b.name)) ?? 0);
      });
  }, [query, mainMuscle, secondaryMuscle, equipment, list, revision]);

  const open = rows.find((row) => row.key === openKey) ?? null;

  useEffect(() => {
    const onCustom = () => setRevision((value) => value + 1);
    window.addEventListener(CUSTOM_CHANGED_EVENT, onCustom);
    return () => window.removeEventListener(CUSTOM_CHANGED_EVENT, onCustom);
  }, []);

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
    if (state?.exerciseDetail || modalDepth() > 0) {
      retreat(state?.exerciseDetail ? 1 : 0);
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
          onCustomChange={() => setRevision((value) => value + 1)}
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
              List
              <select
                value={list}
                onChange={(event) => {
                  setList(event.target.value as "all" | "custom");
                  setOpenKey(null);
                }}
              >
                <option value="all">All</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>
              Main muscle
              <select value={mainMuscle} onChange={(event) => setMainMuscle(event.target.value)}>
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
              Secondary muscle
              <select value={secondaryMuscle} onChange={(event) => setSecondaryMuscle(event.target.value)}>
                <option value="all">All</option>
                {CATALOGUE_MUSCLES.map((item) => (
                  <option key={item} value={item}>
                    {labelize(item)}
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
                      {row.custom
                        ? "Custom"
                        : row.exercise
                          ? row.exercise.primaryMuscles.map(labelize).join(", ") || labelize(row.exercise.category)
                          : ""}
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

export function ExerciseDetail({
  row,
  addDay,
  notice,
  days,
  onAddDay,
  onAdd,
  onBack,
  onCustomChange,
}: {
  row: ExerciseDetailRow;
  addDay: string;
  notice: string;
  days: Array<{ id: string; name: string }>;
  onAddDay: (day: string) => void;
  onAdd: () => void;
  onBack: () => void;
  onCustomChange: () => void;
}) {
  if (row.exercise) {
    return (
      <CatalogueDetail
        row={row}
        exercise={row.exercise}
        addDay={addDay}
        notice={notice}
        days={days}
        onAddDay={onAddDay}
        onAdd={onAdd}
        onBack={onBack}
      />
    );
  }
  return (
    <CustomDetail
      item={row.custom ?? { name: row.name, muscles: [], cardio: false }}
      addDay={addDay}
      notice={notice}
      days={days}
      onAddDay={onAddDay}
      onAdd={onAdd}
      onBack={onBack}
      onCustomChange={onCustomChange}
    />
  );
}

function CatalogueDetail({
  row,
  exercise,
  addDay,
  notice,
  days,
  onAddDay,
  onAdd,
  onBack,
}: {
  row: ExerciseDetailRow;
  exercise: CatalogueExercise;
  addDay: string;
  notice: string;
  days: Array<{ id: string; name: string }>;
  onAddDay: (day: string) => void;
  onAdd: () => void;
  onBack: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const photo = exercise.images[0];

  return (
    <article className="ex-detail">
      <button type="button" className="text-back" onClick={onBack}>
        ‹ Back
      </button>
      <h2>{row.name}</h2>
      {nameTrainsCardio(row.name) ? <p className="heart-line">Heart & lungs</p> : null}
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
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      {notice ? <p className="tracker-notice">{notice}</p> : null}
    </article>
  );
}

function CustomDetail({
  item,
  addDay,
  notice,
  days,
  onAddDay,
  onAdd,
  onBack,
  onCustomChange,
}: {
  item: CustomExercise;
  addDay: string;
  notice: string;
  days: Array<{ id: string; name: string }>;
  onAddDay: (day: string) => void;
  onAdd: () => void;
  onBack: () => void;
  onCustomChange: () => void;
}) {
  const [muscles, setMuscles] = useState(item.muscles);
  const [cardio, setCardio] = useState(item.cardio);
  const [saved, setSaved] = useState(false);
  const [stored, setStored] = useState(() => Boolean(customByName(item.name)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  useDismissOnBack(confirmDelete, () => setConfirmDelete(false));

  return (
    <article className="ex-detail">
      <button type="button" className="text-back" onClick={onBack}>
        ‹ Back
      </button>
      <h2>{item.name}</h2>
      {stored ? <p className="ex-detail-meta">Custom</p> : null}
      {cardio ? <p className="heart-line">Heart & lungs</p> : null}
      <div className="ex-figure">
        <Figure paint={paintWorked(muscles)} height={180} label={`${item.name} muscles`} />
      </div>
      <MuscleEditor
        muscles={muscles}
        cardio={cardio}
        onChange={(next) => {
          setMuscles(next.muscles);
          setCardio(next.cardio);
          setSaved(false);
        }}
      />
      <div className="manage-actions editor-actions">
        <button type="button" onClick={onBack}>
          Close
        </button>
        <button
          type="button"
          className="manage-save"
          onClick={() => {
            if (!saveCustomExercise({ name: item.name, muscles, cardio })) return;
            setStored(true);
            setSaved(true);
            onCustomChange();
          }}
        >
          Save
        </button>
      </div>
      {saved ? <p className="tracker-notice">Saved</p> : null}
      {stored ? (
        <button
          type="button"
          className={confirmDelete ? "remove-workout confirm" : "remove-workout"}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            deleteCustomExercise(item.name);
            onCustomChange();
            onBack();
          }}
        >
          {confirmDelete ? "Delete?" : "Delete"}
        </button>
      ) : null}
      <div className="add-day">
        <label>
          Add to
          <select value={addDay} onChange={(event) => onAddDay(event.target.value)}>
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                {day.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      {notice ? <p className="tracker-notice">{notice}</p> : null}
    </article>
  );
}
