import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, matches, matchPlayers, motmVotes, players, pollReplies, polls, settings, type Player, type Poll } from "@/db";
import { effectiveMotm } from "./motm";
import { overall, strength } from "./rating";
import { computePairs, computeStats, emptyStats, type PlayerStats } from "./stats";

export type PlayerRow = Player & { overall: number; strength: number; stats: PlayerStats };

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? { id: 1, formWeight: 1 };
}

/** Loads everything; a club's worth of data is small, so stats are computed in memory. */
export async function loadClub() {
  const [allPlayers, rawMatches, entries, votes, cfg] = await Promise.all([
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(matches).orderBy(desc(matches.date), desc(matches.id)),
    db.select().from(matchPlayers),
    db.select().from(motmVotes),
    getSettings(),
  ]);
  // motmId = who actually gets the award (admin pick, else vote winner)
  const allMatches = rawMatches.map((m) => ({
    ...m,
    motmId: effectiveMotm(m.motmPlayerId, votes.filter((v) => v.matchId === m.id)),
  }));
  const stats = computeStats(
    allMatches.map((m) => ({ ...m, motmPlayerId: m.motmId })),
    entries,
  );
  const rows: PlayerRow[] = allPlayers.map((p) => {
    const s = stats.get(p.id) ?? emptyStats();
    const ovr = overall(p);
    return { ...p, overall: ovr, strength: strength(ovr, s.elo, cfg.formWeight), stats: s };
  });
  const pairs = computePairs(allMatches, entries);
  return { players: rows, matches: allMatches, entries, votes, pairs, settings: cfg };
}

async function withReplies(poll: Poll | undefined) {
  if (!poll) return null;
  const replies = await db.select().from(pollReplies).where(eq(pollReplies.pollId, poll.id));
  return { ...poll, replies };
}

export type PollWithReplies = NonNullable<Awaited<ReturnType<typeof withReplies>>>;

/** The "who's coming?" poll that is currently collecting replies, if any. */
export async function getOpenPoll() {
  const [poll] = await db.select().from(polls).where(eq(polls.open, true)).orderBy(desc(polls.id)).limit(1);
  return withReplies(poll);
}

/** Most recently created poll, open or not. */
export async function getLatestPoll() {
  const [poll] = await db.select().from(polls).orderBy(desc(polls.id)).limit(1);
  return withReplies(poll);
}

export async function getPollByToken(token: string) {
  const [poll] = await db.select().from(polls).where(eq(polls.token, token));
  return withReplies(poll);
}

/** Active players, names only (safe for public pages). */
export async function getActivePlayerNames() {
  return db.select({ id: players.id, name: players.name }).from(players).where(eq(players.active, true)).orderBy(asc(players.name));
}
