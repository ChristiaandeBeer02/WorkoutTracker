import { useMemo, useState } from "react";
import type { MuscleGroup } from "../anatomy";
import { CloseOnBack } from "../closeOnBack";
import { saveCustomExercise } from "../customExercises";
import { catalogueByName, labelize, type CatalogueExercise } from "../exercises";
import { searchByName } from "../exerciseSearch";
import { CATALOGUE_MUSCLE_NAMES, DB_MUSCLE_REGIONS, paintCustom } from "../muscles";
import { Figure } from "./Figure";

function muscleForRegion(group: MuscleGroup): string | undefined {
  for (const [name, regions] of Object.entries(DB_MUSCLE_REGIONS)) {
    if (regions.includes(group)) return name;
  }
  return undefined;
}

type MuscleRole = "off" | "main" | "secondary";

export function MuscleEditor({
  muscles,
  secondary,
  cardio,
  onChange,
}: {
  muscles: string[];
  secondary: string[];
  cardio: boolean;
  onChange: (next: { muscles: string[]; secondary: string[]; cardio: boolean }) => void;
}) {
  const [sameAs, setSameAs] = useState("");
  const matches = useMemo(() => {
    const needle = sameAs.trim();
    if (!needle) return [];
    const found: CatalogueExercise[] = [];
    for (const name of searchByName(needle, { customNames: [], limit: 6 })) {
      const exercise = catalogueByName(name);
      if (exercise) found.push(exercise);
    }
    return found;
  }, [sameAs]);

  function roleOf(name: string): MuscleRole {
    if (muscles.includes(name)) return "main";
    if (secondary.includes(name)) return "secondary";
    return "off";
  }

  function cycleMuscle(name: string) {
    const role = roleOf(name);
    const main = new Set(muscles);
    const extra = new Set(secondary);
    main.delete(name);
    extra.delete(name);
    if (role === "off") main.add(name);
    else if (role === "main") extra.add(name);
    onChange({
      muscles: CATALOGUE_MUSCLE_NAMES.filter((item) => main.has(item)),
      secondary: CATALOGUE_MUSCLE_NAMES.filter((item) => extra.has(item)),
      cardio,
    });
  }

  function toggleRegion(group: MuscleGroup) {
    const name = muscleForRegion(group);
    if (name) cycleMuscle(name);
  }

  function copyFrom(name: string) {
    const exercise = catalogueByName(name);
    if (!exercise) return;
    const main = new Set(exercise.primaryMuscles.map((item) => item.trim().toLowerCase()));
    const extra = new Set(exercise.secondaryMuscles.map((item) => item.trim().toLowerCase()));
    onChange({
      muscles: CATALOGUE_MUSCLE_NAMES.filter((item) => main.has(item)),
      secondary: CATALOGUE_MUSCLE_NAMES.filter((item) => extra.has(item) && !main.has(item)),
      cardio: exercise.category === "cardio",
    });
    setSameAs("");
  }

  return (
    <div className="muscle-editor">
      <p className="muscle-cycle">
        <span className="muscle-cycle-key">
          <span className="muscle-cycle-swatch is-main" aria-hidden="true" />
          Main
        </span>
        <span className="muscle-cycle-key">
          <span className="muscle-cycle-swatch is-secondary" aria-hidden="true" />
          Secondary
        </span>
        <span>Tap to cycle: main, secondary, off</span>
      </p>
      <div className="muscle-chips">
        {CATALOGUE_MUSCLE_NAMES.map((name) => {
          const role = roleOf(name);
          return (
            <button
              key={name}
              type="button"
              data-role={role}
              aria-pressed={role === "main" ? true : role === "secondary" ? "mixed" : false}
              onClick={() => cycleMuscle(name)}
            >
              {labelize(name)}
            </button>
          );
        })}
        <button type="button" aria-pressed={cardio} onClick={() => onChange({ muscles, secondary, cardio: !cardio })}>
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
        <Figure
          paint={paintCustom(muscles, secondary)}
          height={150}
          label="Tap a region to cycle main, secondary, or off"
          onPick={toggleRegion}
        />
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
      <CloseOnBack onClose={onClose} />
      <button type="button" className="backdrop" aria-label="Close link muscles" onClick={onClose} />
      <div className="manage-pop" role="dialog" aria-modal="true" aria-labelledby="map-title">
        <h2 id="map-title">Link muscles</h2>
        <p>{dayName}</p>
        {names.map((name) => (
          <MapOne key={name} name={name} onSaved={onSaved} onClose={onClose} />
        ))}
      </div>
    </>
  );
}

function MapOne({ name, onSaved, onClose }: { name: string; onSaved: () => void; onClose: () => void }) {
  const [muscles, setMuscles] = useState<string[]>([]);
  const [secondary, setSecondary] = useState<string[]>([]);
  const [cardio, setCardio] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <section className="map-one">
      <h3>{name}</h3>
      <MuscleEditor
        muscles={muscles}
        secondary={secondary}
        cardio={cardio}
        onChange={(next) => {
          setMuscles(next.muscles);
          setSecondary(next.secondary);
          setCardio(next.cardio);
          setSaved(false);
        }}
      />
      <div className="manage-actions editor-actions">
        <button type="button" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="manage-save"
          onClick={() => {
            if (!saveCustomExercise({ name, muscles, secondary, cardio })) return;
            setSaved(true);
            onSaved();
          }}
        >
          Save
        </button>
      </div>
      {saved ? <p className="tracker-notice">Saved</p> : null}
    </section>
  );
}
