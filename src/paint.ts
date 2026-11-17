import type { MuscleGroup } from "./anatomy";

export type Paint = Partial<Record<MuscleGroup, { color: string; opacity: number }>>;

export function paintAll(groups: readonly MuscleGroup[], color: string, opacity: number): Paint {
  const out: Paint = {};
  for (const group of groups) out[group] = { color, opacity };
  return out;
}
