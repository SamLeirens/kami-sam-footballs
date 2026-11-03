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
      isGuest: formData.get("isGuest") === "on",
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

export type GuestInput = { name: string; level: number; position: Position };
export type NewGuest = { id: number; name: string; position: Position; strength: number; attack: number; defence: number; isGuest: true };

/** Quick-add a guest from the team picker: one overall level instead of five sliders. */
export async function addGuest(input: GuestInput): Promise<{ error: string } | { guest: NewGuest }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Guest needs a name" };
  if (!POSITIONS.includes(input.position)) return { error: "Pick a position" };
  const level = Math.min(10, Math.max(1, Math.round(Number(input.level) || 5)));
  const [p] = await db
    .insert(players)
    .values({
      name,
      position: input.position,
      isGuest: true,
      attack: level,
      defence: level,
      passing: level,
      fitness: level,
    })
    .returning();
  await db.insert(ratingHistory).values({ playerId: p.id, overall: overall(p) });
  return {
    guest: { id: p.id, name: p.name, position: p.position, strength: overall(p), attack: p.attack, defence: p.defence, isGuest: true },
  };
}

export async function deletePlayer(id: number) {
  await requireAdmin();
  await db.delete(players).where(eq(players.id, id));
  redirect("/players");
}
