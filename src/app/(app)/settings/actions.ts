"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db, seasons, settings } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const w = Number(formData.get("formWeight"));
  const formWeight = Number.isFinite(w) ? Math.min(2, Math.max(0, w)) : 1;
  await db.insert(settings).values({ id: 1, formWeight }).onConflictDoUpdate({ target: settings.id, set: { formWeight } });
  refresh();
}

export type SeasonState = { error?: string } | null;

export async function addSeason(_prev: SeasonState, formData: FormData): Promise<SeasonState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  if (!name) return { error: "Give the season a name" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: "Pick a start date" };
  const inserted = await db.insert(seasons).values({ name, startDate }).onConflictDoNothing().returning();
  if (!inserted.length) return { error: "A season already starts on that date" };
  refresh();
  return null;
}

export async function deleteSeason(id: number) {
  await requireAdmin();
  await db.delete(seasons).where(eq(seasons.id, id));
  refresh();
}
