import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, matches, matchPlayers, motmVotes, players, ratingHistory, rsvps, seasons, settings, type Player } from "@/db";
import { requireAdmin } from "./auth";
import { effectiveMotm } from "./motm";
import { toPublicPlayer } from "./publicView";
import { overall, strength } from "./rating";
import { resolveSeason, seasonRanges, inRange, type SeasonRange } from "./seasons";
import { computePairs, computeStats, emptyStats, type PlayerStats } from "./stats";

export type PlayerRow = Player & { overall: number; strength: number; stats: PlayerStats };

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? { id: 1, formWeight: 1 };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ADMIN ONLY: loads everything, including player ratings. Redirects to /login otherwise.
 * A club's worth of data is small, so stats are computed in memory.
 * `season`: a `?season=` value ("all", an id, or undefined = current season).
 * Player `stats` cover the selected season; Elo and strength always use all matches.
 */
export async function loadClub(opts: { season?: string } = {}) {
  await requireAdmin();
  return loadAll(opts);
}

/**
 * For the public match page (no login). Players carry only names, ids and basic stats:
 * never ratings, strength or Elo. Use this, not loadClub, anywhere a non-admin can look.
 */
export async function loadPublicClub() {
  const { players, members, matches, entries, votes, rsvps, season } = await loadAll({});
  return {
    players: players.map(toPublicPlayer),
    members: members.map(toPublicPlayer),
    matches,
    entries,
    votes,
    rsvps,
    season,
  };
}

/** ADMIN ONLY: a player's rating over time. */
export async function loadRatingHistory(playerId: number) {
  await requireAdmin();
  return db.select().from(ratingHistory).where(eq(ratingHistory.playerId, playerId)).orderBy(asc(ratingHistory.createdAt));
}

async function loadAll(opts: { season?: string }) {
  const [allPlayers, rawMatches, entries, votes, replies, seasonRows, cfg] = await Promise.all([
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(matches).orderBy(desc(matches.date), desc(matches.id)),
    db.select().from(matchPlayers),
    db.select().from(motmVotes),
    db.select().from(rsvps),
    db.select().from(seasons),
    getSettings(),
  ]);
  // motmId = who actually gets the award (admin pick, else vote winner)
  const allMatches = rawMatches.map((m) => ({
    ...m,
    motmId: effectiveMotm(m.motmPlayerId, votes.filter((v) => v.matchId === m.id)),
  }));
  const forStats = (ms: typeof allMatches) => ms.map((m) => ({ ...m, motmPlayerId: m.motmId }));

  const ranges = seasonRanges(seasonRows);
  const season: SeasonRange | null = resolveSeason(ranges, opts.season, todayISO());
  const seasonMatches = season ? allMatches.filter((m) => inRange(m.date, season)) : allMatches;

  const allTime = computeStats(forStats(allMatches), entries);
  const scoped = season ? computeStats(forStats(seasonMatches), entries) : allTime;

  const rows: PlayerRow[] = allPlayers.map((p) => {
    const elo = (allTime.get(p.id) ?? emptyStats()).elo;
    const s = { ...(scoped.get(p.id) ?? emptyStats()), elo };
    const ovr = overall(p);
    return { ...p, overall: ovr, strength: strength(ovr, elo, cfg.formWeight), stats: s };
  });
  const pairs = computePairs(seasonMatches, entries);
  return {
    players: rows,
    /** members only: what leaderboards and stats tables show */
    members: rows.filter((p) => !p.isGuest),
    matches: allMatches,
    entries,
    votes,
    rsvps: replies,
    pairs,
    seasons: ranges,
    season,
    settings: cfg,
  };
}
