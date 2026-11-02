"use server";

import { refresh } from "next/cache";
import { db, settings } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const w = Number(formData.get("formWeight"));
  const formWeight = Number.isFinite(w) ? Math.min(2, Math.max(0, w)) : 1;
  await db.insert(settings).values({ id: 1, formWeight }).onConflictDoUpdate({ target: settings.id, set: { formWeight } });
  refresh();
}
