"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db, players, POSITIONS, ratingHistory, type Position } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { overall } from "@/lib/rating";

export type FormState = { error?: string; ok?: number } | null;

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const position = String(formData.get("position")) as Position;
  const num = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? Math.min(10, Math.max(1, Math.round(v))) : 5;
  };
  if (!name) return { error: "Name is required" } as const;
  if (!POSITIONS.includes(position)) return { error: "Pick a position" } as const;
  return {
    data: {
      name,
      position,
      attack: num("attack"),
      defence: num("defence"),
      passing: num("passing"),
      fitness: num("fitness"),
      goalkeeping: num("goalkeeping"),
    },
  } as const;
}

export async function createPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };
  const [p] = await db.insert(players).values(parsed.data).returning();
  await db.insert(ratingHistory).values({ playerId: p.id, overall: overall(p) });
  refresh();
  return { ok: Date.now() };
}

export async function updatePlayer(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };
  const [before] = await db.select().from(players).where(eq(players.id, id));
  if (!before) return { error: "Player not found" };
  const [after] = await db
    .update(players)
    .set({ ...parsed.data, active: formData.get("active") === "on" })
    .where(eq(players.id, id))
    .returning();
  if (overall(before) !== overall(after)) {
    await db.insert(ratingHistory).values({ playerId: id, overall: overall(after) });
  }
  refresh();
  return { ok: Date.now() };
}

export async function deletePlayer(id: number) {
  await requireAdmin();
  await db.delete(players).where(eq(players.id, id));
  redirect("/players");
}
