"use server";

import { randomBytes } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db, matches, matchPlayers, motmVotes, rsvps } from "@/db";
import { requireAdmin } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Saves picked teams: a new match, or the line-up of an already planned one (`matchId`). */
export async function createMatch(input: { matchId?: number; date: string; teamA: number[]; teamB: number[] }) {
  await requireAdmin();
  if (!DATE_RE.test(input.date)) return { error: "Invalid date" };
  if (!input.teamA.length || !input.teamB.length) return { error: "Both teams need players" };
  const ids = [...input.teamA, ...input.teamB];
  if (new Set(ids).size !== ids.length) return { error: "A player is on both teams" };

  const id = await db.transaction(async (tx) => {
    let matchId = input.matchId;
    if (matchId) {
      const [m] = await tx.update(matches).set({ date: input.date }).where(eq(matches.id, matchId)).returning({ id: matches.id });
      if (!m) throw new Error("Match not found");
      await tx.delete(matchPlayers).where(eq(matchPlayers.matchId, matchId));
      await tx.delete(motmVotes).where(eq(motmVotes.matchId, matchId));
    } else {
      const [m] = await tx.insert(matches).values({ date: input.date }).returning({ id: matches.id });
      matchId = m.id;
    }
    const mid = matchId;
    await tx.insert(matchPlayers).values([
      ...input.teamA.map((playerId) => ({ matchId: mid, playerId, team: "A" as const })),
      ...input.teamB.map((playerId) => ({ matchId: mid, playerId, team: "B" as const })),
    ]);
    return mid;
  });
  redirect(`/matches/${id}`);
}

/** Creates an upcoming match without teams, with a link players use to say if they're in. */
export async function planMatch(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!DATE_RE.test(date)) return;
  const [m] = await db
    .insert(matches)
    .values({ date, shareToken: randomBytes(9).toString("base64url") })
    .returning({ id: matches.id });
  redirect(`/matches/${m.id}`);
}

/** Admin sets someone's reply (e.g. they told you in the group chat). null clears it. */
export async function setRsvp(matchId: number, playerId: number, status: "in" | "out" | null) {
  await requireAdmin();
  if (status === null) {
    await db.delete(rsvps).where(and(eq(rsvps.matchId, matchId), eq(rsvps.playerId, playerId)));
  } else {
    await db
      .insert(rsvps)
      .values({ matchId, playerId, status })
      .onConflictDoUpdate({ target: [rsvps.matchId, rsvps.playerId], set: { status, updatedAt: new Date() } });
  }
  refresh();
}

const optInt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Math.round(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export async function saveResult(matchId: number, formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const scoreA = optInt(formData.get("scoreA"));
  const scoreB = optInt(formData.get("scoreB"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  // Only count as played when both scores are filled in.
  const played = scoreA !== null && scoreB !== null;

  const motm = Number(formData.get("motm")) || null;

  await db.transaction(async (tx) => {
    const rows = await tx.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    await tx
      .update(matches)
      .set({
        scoreA: played ? scoreA : null,
        scoreB: played ? scoreB : null,
        notes,
        // must be someone who played in this match
        motmPlayerId: motm && rows.some((r) => r.playerId === motm) ? motm : null,
        ...(DATE_RE.test(date) ? { date } : {}),
      })
      .where(eq(matches.id, matchId));
    for (const r of rows) {
      await tx
        .update(matchPlayers)
        .set({ goals: optInt(formData.get(`goals_${r.playerId}`)), assists: optInt(formData.get(`assists_${r.playerId}`)) })
        .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, r.playerId)));
    }
  });
  refresh();
}

export async function switchTeam(matchId: number, playerId: number) {
  await requireAdmin();
  const where = and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, playerId));
  const [row] = await db.select().from(matchPlayers).where(where);
  if (row) await db.update(matchPlayers).set({ team: row.team === "A" ? "B" : "A" }).where(where);
  refresh();
}

export async function removeFromMatch(matchId: number, playerId: number) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.delete(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, playerId)));
    await tx
      .delete(motmVotes)
      .where(and(eq(motmVotes.matchId, matchId), or(eq(motmVotes.voterId, playerId), eq(motmVotes.candidateId, playerId))));
    await tx
      .update(matches)
      .set({ motmPlayerId: sql`NULLIF(${matches.motmPlayerId}, ${playerId})` })
      .where(eq(matches.id, matchId));
  });
  refresh();
}

export async function addToMatch(matchId: number, formData: FormData) {
  await requireAdmin();
  const playerId = Number(formData.get("playerId"));
  const team = formData.get("team") === "B" ? "B" : "A";
  if (!playerId) return;
  await db.insert(matchPlayers).values({ matchId, playerId, team }).onConflictDoNothing();
  refresh();
}

export async function deleteMatch(matchId: number) {
  await requireAdmin();
  await db.delete(matches).where(eq(matches.id, matchId));
  redirect("/matches");
}

export async function createShareLink(matchId: number) {
  await requireAdmin();
  const token = randomBytes(9).toString("base64url");
  await db
    .update(matches)
    .set({ shareToken: sql`COALESCE(${matches.shareToken}, ${token})` })
    .where(eq(matches.id, matchId));
  refresh();
}

export async function setVotingOpen(matchId: number, open: boolean) {
  await requireAdmin();
  await db.update(matches).set({ votingOpen: open }).where(eq(matches.id, matchId));
  refresh();
}

/** Remove a vote, e.g. if someone voted using another player's name. */
export async function removeVote(matchId: number, voterId: number) {
  await requireAdmin();
  await db.delete(motmVotes).where(and(eq(motmVotes.matchId, matchId), eq(motmVotes.voterId, voterId)));
  refresh();
}
