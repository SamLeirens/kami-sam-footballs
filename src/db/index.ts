import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function client() {
  const url = process.env.DATABASE_URL;
  // postgres.js connects lazily, so a missing URL only fails when a query runs
  // (lets `next build` work without a database).
  if (!url) console.warn("DATABASE_URL is not set");
  // prepare:false keeps it compatible with poolers (Neon/Supabase pooled URLs).
  return postgres(url ?? "postgres://localhost/missing-database-url", { prepare: false, max: 5 });
}

const sql = globalForDb.sql ?? client();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export * from "./schema";
