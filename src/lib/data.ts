import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, matches, matchPlayers, players, settings, type Player } from "@/db";
import { overall, strength } from "./rating";
import { computeStats, emptyStats, type PlayerStats } from "./stats";

export type PlayerRow = Player & { overall: number; strength: number; stats: PlayerStats };

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? { id: 1, formWeight: 1 };
}

/** Loads everything; a club's worth of data is small, so stats are computed in memory. */
export async function loadClub() {
  const [allPlayers, allMatches, entries, cfg] = await Promise.all([
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(matches).orderBy(desc(matches.date), desc(matches.id)),
    db.select().from(matchPlayers),
    getSettings(),
  ]);
  const stats = computeStats(allMatches, entries);
  const rows: PlayerRow[] = allPlayers.map((p) => {
    const s = stats.get(p.id) ?? emptyStats();
    const ovr = overall(p);
    return { ...p, overall: ovr, strength: strength(ovr, s.elo, cfg.formWeight), stats: s };
  });
  return { players: rows, matches: allMatches, entries, settings: cfg };
}
