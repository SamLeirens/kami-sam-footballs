import { TEAMS } from "./teams";

export type PastMatchInput = {
  date: string;
  scoreA: number | null;
  scoreB: number | null;
  /** playerId → team, goals and assists (null = unknown) */
  players: { playerId: number; team: "A" | "B"; goals: number | null; assists: number | null }[];
  motmPlayerId: number | null;
};

const isCount = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 99);

/** Returns an error message, or null when the match can be saved. */
export function validatePastMatch(m: PastMatchInput, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) return "Pick the date it was played";
  if (m.date > today) return "That date is in the future. Use Plan match or Pick teams for upcoming games";
  if (m.scoreA === null || m.scoreB === null || !isCount(m.scoreA) || !isCount(m.scoreB)) return "Enter the score for both teams";
  const ids = m.players.map((p) => p.playerId);
  if (new Set(ids).size !== ids.length) return "A player is listed twice";
  for (const t of ["A", "B"] as const) {
    if (!m.players.some((p) => p.team === t)) return `Pick who played for ${TEAMS[t].name}`;
  }
  if (!m.players.every((p) => isCount(p.goals) && isCount(p.assists))) return "Goals and assists must be whole numbers";
  for (const t of ["A", "B"] as const) {
    const goals = m.players.filter((p) => p.team === t).reduce((s, p) => s + (p.goals ?? 0), 0);
    const score = t === "A" ? m.scoreA : m.scoreB;
    if (goals > score) return `${TEAMS[t].name}'s players have ${goals} goals but the score says ${score}`;
  }
  if (m.motmPlayerId !== null && !ids.includes(m.motmPlayerId)) return "Man of the match must be someone who played";
  return null;
}
