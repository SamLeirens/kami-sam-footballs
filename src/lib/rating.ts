import type { Position } from "@/lib/positions";

export type Attributes = {
  attack: number;
  defence: number;
  passing: number;
  fitness: number;
  goalkeeping: number;
};

export const ATTRIBUTES: { key: keyof Attributes; label: string }[] = [
  { key: "attack", label: "Attack" },
  { key: "defence", label: "Defence" },
  { key: "passing", label: "Passing" },
  { key: "fitness", label: "Fitness" },
  { key: "goalkeeping", label: "Goalkeeping" },
];

/** Overall rating 1-10 from the attributes you set. Keepers lean on goalkeeping. */
export function overall(p: Attributes & { position: Position }): number {
  const outfield = (p.attack + p.defence + p.passing + p.fitness) / 4;
  const value = p.position === "GK" ? 0.6 * p.goalkeeping + 0.4 * outfield : outfield;
  return round1(value);
}

export const ELO_START = 1000;
export const MAX_FORM_ADJUST = 2;

/**
 * Strength used for team balancing: your rating, nudged by results.
 * Every 100 Elo above/below the start = 1 rating point * formWeight, capped at ±2.
 */
export function strength(ovr: number, elo: number, formWeight: number): number {
  const adj = ((elo - ELO_START) / 100) * formWeight;
  return round1(ovr + Math.max(-MAX_FORM_ADJUST, Math.min(MAX_FORM_ADJUST, adj)));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}
