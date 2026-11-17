import raw from "./data/exercises.json";

/**
 * Exercise catalogue from free-exercise-db (https://github.com/yuhonas/free-exercise-db),
 * Unlicense. Images are not bundled; they load from the repository when viewed.
 */
export interface CatalogueExercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  level: string;
  category: string;
  images: string[];
  instructions: string[];
}

export const EXERCISE_CATALOGUE: CatalogueExercise[] = raw;

export const EXERCISE_IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export function exerciseImageUrl(path: string): string {
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${EXERCISE_IMAGE_BASE}${encoded}`;
}

const BY_NAME = new Map<string, CatalogueExercise>();
for (const exercise of EXERCISE_CATALOGUE) {
  BY_NAME.set(exercise.name.trim().toLowerCase(), exercise);
}

export function catalogueByName(name: string): CatalogueExercise | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

export function labelize(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const value of values) {
    if (value && value.trim()) found.add(value.trim());
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export const CATALOGUE_MUSCLES = uniqueSorted(
  EXERCISE_CATALOGUE.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]),
);

export const CATALOGUE_EQUIPMENT = uniqueSorted(EXERCISE_CATALOGUE.map((exercise) => exercise.equipment));

const SUGGESTION_CAP = 20;

/** Database names that match the query, after earlier suggestion groups. */
export function catalogueNameMatches(query: string, already: ReadonlySet<string>): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: string[] = [];
  for (const exercise of EXERCISE_CATALOGUE) {
    const name = exercise.name.trim();
    const key = name.toLowerCase();
    if (key === needle || !key.includes(needle) || already.has(key)) continue;
    matches.push(name);
    if (matches.length >= SUGGESTION_CAP) break;
  }
  return matches;
}
