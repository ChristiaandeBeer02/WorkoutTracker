import { useMemo, useState } from "react";
import type { MuscleGroup } from "../anatomy";
import { saveCustomExercise } from "../customExercises";
import { EXERCISE_CATALOGUE, catalogueByName, labelize } from "../exercises";
import { CATALOGUE_MUSCLE_NAMES, DB_MUSCLE_REGIONS, paintWorked } from "../muscles";
import { Figure } from "./Figure";

function muscleForRegion(group: MuscleGroup): string | undefined {
  for (const [name, regions] of Object.entries(DB_MUSCLE_REGIONS)) {
    if (regions.includes(group)) return name;
  }
  return undefined;
}

export function MuscleEditor({
  muscles,
  cardio,
  onChange,
}: {
  muscles: string[];
  cardio: boolean;
  onChange: (next: { muscles: string[]; cardio: boolean }) => void;
}) {
  const [sameAs, setSameAs] = useState("");
  const selected = new Set(muscles);
  const matches = useMemo(() => {
    const needle = sameAs.trim().toLowerCase();
    if (!needle) return [];
    return EXERCISE_CATALOGUE.filter((exercise) => exercise.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [sameAs]);

  function toggleMuscle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange({ muscles: CATALOGUE_MUSCLE_NAMES.filter((item) => next.has(item)), cardio });
  }

  function toggleRegion(group: MuscleGroup) {
    const name = muscleForRegion(group);
    if (name) toggleMuscle(name);
  }

  function copyFrom(name: string) {
    const exercise = catalogueByName(name);
    if (!exercise) return;
    const worked = new Set([...exercise.primaryMuscles, ...exercise.secondaryMuscles]);
    onChange({
      muscles: CATALOGUE_MUSCLE_NAMES.filter((item) => worked.has(item)),
      cardio: exercise.category === "cardio",
    });
    setSameAs("");
  }

  return (
    <div className="muscle-editor">
      <div className="muscle-chips">
        {CATALOGUE_MUSCLE_NAMES.map((name) => (
          <button key={name} type="button" aria-pressed={selected.has(name)} onClick={() => toggleMuscle(name)}>
            {labelize(name)}
          </button>
        ))}
        <button type="button" aria-pressed={cardio} onClick={() => onChange({ muscles, cardio: !cardio })}>
          Heart & lungs
        </button>
      </div>
      <label className="same-as">
        Same muscles as
        <input
          value={sameAs}
          placeholder="Search the catalogue"
          onChange={(event) => setSameAs(event.target.value)}
        />
      </label>
      {matches.length > 0 ? (
        <ul className="same-as-list">
          {matches.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" onClick={() => copyFrom(exercise.name)}>
                {exercise.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="editor-figure">
        <Figure paint={paintWorked(muscles)} height={150} label="Tap a region to toggle it" onPick={toggleRegion} />
      </div>
    </div>
  );
}

export function MapDialog({
  dayName,
  names,
  onClose,
  onSaved,
}: {
  dayName: string;
  names: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <>
      <button type="button" className="backdrop" aria-label="Close link muscles" onClick={onClose} />
      <div className="manage-pop" role="dialog" aria-modal="true" aria-labelledby="map-title">
        <h2 id="map-title">Link muscles</h2>
        <p>{dayName}</p>
        {names.map((name) => (
          <MapOne key={name} name={name} onSaved={onSaved} />
        ))}
        <button type="button" className="text-back" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}

function MapOne({ name, onSaved }: { name: string; onSaved: () => void }) {
  const [muscles, setMuscles] = useState<string[]>([]);
  const [cardio, setCardio] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <section className="map-one">
      <h3>{name}</h3>
      <MuscleEditor
        muscles={muscles}
        cardio={cardio}
        onChange={(next) => {
          setMuscles(next.muscles);
          setCardio(next.cardio);
          setSaved(false);
        }}
      />
      <button
        type="button"
        className="manage-save map-save"
        onClick={() => {
          if (!saveCustomExercise({ name, muscles, cardio })) return;
          setSaved(true);
          onSaved();
        }}
      >
        Save
      </button>
      {saved ? <p className="tracker-notice">Saved</p> : null}
    </section>
  );
}
