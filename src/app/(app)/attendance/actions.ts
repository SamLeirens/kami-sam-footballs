"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db, pollReplies, polls } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { isAnswer, type Answer } from "@/lib/poll";

export async function createPoll(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const token = randomBytes(9).toString("base64url");
  await db.transaction(async (tx) => {
    // Only one poll collects replies at a time.
    await tx.update(polls).set({ open: false }).where(eq(polls.open, true));
    await tx.insert(polls).values({ date, token });
  });
  refresh();
}

/** Admin sets someone's answer (e.g. they replied in the chat instead). null clears it. */
export async function setReply(pollId: number, playerId: number, answer: Answer | null) {
  await requireAdmin();
  const where = and(eq(pollReplies.pollId, pollId), eq(pollReplies.playerId, playerId));
  if (answer === null) await db.delete(pollReplies).where(where);
  else if (isAnswer(answer))
    await db
      .insert(pollReplies)
      .values({ pollId, playerId, answer })
      .onConflictDoUpdate({ target: [pollReplies.pollId, pollReplies.playerId], set: { answer, updatedAt: new Date() } });
  refresh();
}

export async function setPollOpen(pollId: number, open: boolean) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    if (open) await tx.update(polls).set({ open: false }).where(eq(polls.open, true));
    await tx.update(polls).set({ open }).where(eq(polls.id, pollId));
  });
  refresh();
}

export async function deletePoll(pollId: number) {
  await requireAdmin();
  await db.delete(polls).where(eq(polls.id, pollId));
  refresh();
}
