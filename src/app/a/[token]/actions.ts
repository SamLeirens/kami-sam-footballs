"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { db, players, pollReplies, polls } from "@/db";
import { isAnswer } from "@/lib/poll";
import { ME_COOKIE } from "./me-cookie";

export type ReplyState = { error?: string; saved?: boolean } | null;

/** Public (no login): a player says whether they're coming. They can change it while the poll is open. */
export async function reply(token: string, _prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const playerId = Number(formData.get("player"));
  const answer = formData.get("answer");
  if (!playerId) return { error: "Pick your name first." };
  if (!isAnswer(answer)) return { error: "Pick an answer." };

  const [poll] = await db.select().from(polls).where(eq(polls.token, token));
  if (!poll) return { error: "Poll not found." };
  if (!poll.open) return { error: "Replies are closed." };
  const [player] = await db.select().from(players).where(and(eq(players.id, playerId), eq(players.active, true)));
  if (!player) return { error: "Unknown player." };

  await db
    .insert(pollReplies)
    .values({ pollId: poll.id, playerId, answer })
    .onConflictDoUpdate({ target: [pollReplies.pollId, pollReplies.playerId], set: { answer, updatedAt: new Date() } });

  // Remember who's on this device, so next week it's one tap.
  (await cookies()).set(ME_COOKIE, String(playerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
  return { saved: true };
}
