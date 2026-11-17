"use server";

import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db, matches, matchPlayers, motmVotes, players, rsvps } from "@/db";
import { isRsvpStatus, rsvpNotice, type RsvpStatus } from "@/lib/rsvp";
import { notify } from "@/lib/ntfy";
import { ME_COOKIE, rsvpCookie, voteCookie } from "./vote-cookie";

export type VoteState = { error?: string } | null;

/** Public (no login): a player casts their man-of-the-match vote. */
export async function castVote(token: string, _prev: VoteState, formData: FormData): Promise<VoteState> {
  const voterId = Number(formData.get("voter"));
  const candidateId = Number(formData.get("candidate"));
  if (!voterId) return { error: "Pick your name first." };
  if (!candidateId) return { error: "Pick who gets your vote." };
  if (voterId === candidateId) return { error: "You can't vote for yourself 😉" };

  const [match] = await db.select().from(matches).where(eq(matches.shareToken, token));
  if (!match) return { error: "Match not found." };
  if (match.scoreA === null || match.scoreB === null) return { error: "Voting opens once the result is in." };
  if (!match.votingOpen || match.motmPlayerId !== null) return { error: "Voting is closed." };

  const lineup = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
  const ids = new Set(lineup.map((e) => e.playerId));
  if (!ids.has(voterId) || !ids.has(candidateId)) return { error: "Only players from this match can vote or be voted for." };

  const inserted = await db
    .insert(motmVotes)
    .values({ matchId: match.id, voterId, candidateId })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) return { error: "That name has already voted. Ask the admin if that wasn't you." };

  (await cookies()).set(voteCookie(match.id), String(voterId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  refresh();
  return null;
}

export type RsvpState = { error?: string } | null;

/** Public (no login): a player says whether they're playing in a planned match. */
export async function respond(token: string, _prev: RsvpState, formData: FormData): Promise<RsvpState> {
  const playerId = Number(formData.get("player"));
  const status = formData.get("status");
  if (!playerId) return { error: "Pick your name first." };
  if (!isRsvpStatus(status)) return { error: "Choose in, maybe or out." };

  const [match] = await db.select().from(matches).where(eq(matches.shareToken, token));
  if (!match) return { error: "Match not found." };
  if (match.scoreA !== null) return { error: "This match has already been played." };
  const lineup = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
  if (lineup.length) return { error: "Teams are already picked. Message the organiser if something changed." };
  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  if (!player?.active) return { error: "Unknown player." };

  const [previous] = await db
    .select({ status: rsvps.status })
    .from(rsvps)
    .where(and(eq(rsvps.matchId, match.id), eq(rsvps.playerId, playerId)));

  await db
    .insert(rsvps)
    .values({ matchId: match.id, playerId, status })
    .onConflictDoUpdate({ target: [rsvps.matchId, rsvps.playerId], set: { status, updatedAt: new Date() } });

  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  jar.set(rsvpCookie(match.id), String(playerId), { ...opts, maxAge: 60 * 60 * 24 * 60 });
  jar.set(ME_COOKIE, String(playerId), { ...opts, maxAge: 60 * 60 * 24 * 365 });

  // Tell the admin, but only when the answer changed. Runs after the reply is sent, so the player never waits.
  if (process.env.NTFY_TOPIC && previous?.status !== status) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : null;
    after(async () => {
      // Same people as the match page: active members, plus guests who replied.
      const [all, replies] = await Promise.all([
        db.select().from(players),
        db.select().from(rsvps).where(eq(rsvps.matchId, match.id)),
      ]);
      const active = new Map(all.filter((p) => p.active).map((p) => [p.id, p]));
      const counts: Record<RsvpStatus, number> = { in: 0, maybe: 0, out: 0 };
      for (const r of replies) if (active.has(r.playerId)) counts[r.status]++;
      const answered = new Set(replies.map((r) => r.playerId));
      const waiting = [...active.values()].filter((p) => !p.isGuest && !answered.has(p.id)).length;
      await notify({
        ...rsvpNotice(player.name, status, previous?.status ?? null, match.date, { ...counts, waiting }),
        click: origin ? `${origin}/matches/${match.id}` : undefined,
      });
    });
  }
  refresh();
  return null;
}
