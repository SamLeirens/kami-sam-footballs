import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// node-postgres + attachDatabasePool is Neon's recommended setup on Vercel
// (Fluid compute): one pool per instance, idle clients closed before the
// instance suspends. DATABASE_URL is Neon's pooled (-pooler) string.
const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  // pg connects lazily, so a missing URL only fails when a query runs
  // (lets `next build` work without a database).
  if (!url) console.warn("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url ?? "postgres://localhost/missing-database-url",
    max: 5,
  });
  attachDatabasePool(pool);
  return pool;
}

const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";
