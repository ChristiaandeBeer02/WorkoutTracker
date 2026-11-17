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
  return `${EXERCISE_IMAGE_BASE}${path}`;
}

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
