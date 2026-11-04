import type { PlayerStats } from "./stats";

/**
 * What non-admins (the public /m/<link> page) may know about a player.
 * An allowlist on purpose: ratings (attack, defence, passing, fitness, overall),
 * strength and Elo must NEVER leave the admin side. New columns stay private by default.
 */
export type PublicPlayer = {
  id: number;
  name: string;
  active: boolean;
  isGuest: boolean;
  stats: PublicStats;
};
export type PublicStats = Pick<PlayerStats, "played" | "winPct" | "goals" | "motm">;

export function toPublicPlayer(p: { id: number; name: string; active: boolean; isGuest: boolean; stats: PlayerStats }): PublicPlayer {
  const { played, winPct, goals, motm } = p.stats;
  return { id: p.id, name: p.name, active: p.active, isGuest: p.isGuest, stats: { played, winPct, goals, motm } };
}
