import { LABEL, type MuscleGroup } from "./anatomy";
import { EXERCISES, SEARCH_NAME, type ExerciseInfo } from "./plan";

export function joinNames(groups: MuscleGroup[]): string {
  const names = groups.map((group) => LABEL[group]);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function musclesLine(info: ExerciseInfo): string {
  const primary = info.primaryText ?? joinNames(info.primary);
  const secondary = info.secondaryExtra
    ? [...info.secondary.map((group) => LABEL[group]), info.secondaryExtra]
    : info.secondary.map((group) => LABEL[group]);
  if (secondary.length === 0) return `Primary: ${primary}`;
  const secondaryText =
    secondary.length === 1
      ? secondary[0]
      : `${secondary.slice(0, -1).join(", ")} and ${secondary[secondary.length - 1]}`;
  return `Primary: ${primary} · Secondary: ${secondaryText}`;
}

export function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function watchUrl(name: string): string {
  const term = `${(SEARCH_NAME[name] ?? name).toLowerCase()} form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(term).replace(/%20/g, "+")}`;
}

export function isExercise(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXERCISES, name);
}
