export type Attributes = {
  attack: number;
  defence: number;
  passing: number;
  fitness: number;
};

export const ATTRIBUTES: { key: keyof Attributes; label: string }[] = [
  { key: "attack", label: "Attack" },
  { key: "defence", label: "Defence" },
  { key: "passing", label: "Passing" },
  { key: "fitness", label: "Fitness" },
];

/** Overall rating 1-10: the average of the attributes you set. */
export function overall(p: Attributes): number {
  return round1((p.attack + p.defence + p.passing + p.fitness) / 4);
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
