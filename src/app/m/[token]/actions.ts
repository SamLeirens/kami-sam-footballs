"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { db, matches, matchPlayers, motmVotes, players, rsvps } from "@/db";
import { rsvpCookie, voteCookie } from "./vote-cookie";

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
  if (status !== "in" && status !== "out") return { error: "Choose in or out." };

  const [match] = await db.select().from(matches).where(eq(matches.shareToken, token));
  if (!match) return { error: "Match not found." };
  if (match.scoreA !== null) return { error: "This match has already been played." };
  const lineup = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
  if (lineup.length) return { error: "Teams are already picked. Message the organiser if something changed." };
  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  if (!player?.active) return { error: "Unknown player." };

  await db
    .insert(rsvps)
    .values({ matchId: match.id, playerId, status })
    .onConflictDoUpdate({ target: [rsvps.matchId, rsvps.playerId], set: { status, updatedAt: new Date() } });

  (await cookies()).set(rsvpCookie(match.id), String(playerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  refresh();
  return null;
}
