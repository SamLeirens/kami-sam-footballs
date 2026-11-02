export const POSITIONS = ["GK", "DEF", "MID", "ATT"] as const;
export type Position = (typeof POSITIONS)[number];
