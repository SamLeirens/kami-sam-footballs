// Applies SQL migrations in ./drizzle. Runs before `next build` so a deploy
// keeps the database schema in sync. Skips if DATABASE_URL isn't set.
import { config } from "dotenv";
// `neon deploy` / `neon env pull` write .env.local (or .env); Next.js reads both.
config({ path: [".env.local", ".env"], quiet: true });
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Migrations need a direct (non-pooled) connection; fall back to DATABASE_URL.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set, skipping migrations");
  process.exit(0);
}
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql`INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING`;
await sql.end();
console.log("[migrate] done");
