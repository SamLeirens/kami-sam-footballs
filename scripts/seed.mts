// Fills a local database with demo players and matches: `npm run db:seed`
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { matches, matchPlayers, players, ratingHistory, type Position } from "../src/db/schema";
import { overall } from "../src/lib/rating";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

const names: [string, Position][] = [
  ["Sam", "MID"], ["Kami", "ATT"], ["Tom", "DEF"], ["Jonas", "GK"], ["Pieter", "MID"],
  ["Lucas", "ATT"], ["Ben", "DEF"], ["Arne", "MID"], ["Wout", "GK"], ["Jef", "DEF"],
  ["Milan", "ATT"], ["Ruben", "MID"],
];
const r = () => 3 + Math.floor(Math.random() * 6);

const ps = await db
  .insert(players)
  .values(names.map(([name, position]) => ({
    name, position, attack: r(), defence: r(), passing: r(), fitness: r(),
    goalkeeping: position === "GK" ? 7 + Math.floor(Math.random() * 3) : 2,
  })))
  .returning();
await db.insert(ratingHistory).values(ps.map((p) => ({ playerId: p.id, overall: overall(p) })));

for (let w = 0; w < 6; w++) {
  const d = new Date(Date.UTC(2026, 8, 1 + w * 7)).toISOString().slice(0, 10);
  const [m] = await db.insert(matches).values({ date: d, scoreA: r(), scoreB: r() }).returning();
  const shuffled = [...ps].sort(() => Math.random() - 0.5).slice(0, 10 + (w % 2));
  await db.insert(matchPlayers).values(
    shuffled.map((p, i) => ({ matchId: m.id, playerId: p.id, team: i % 2 ? ("B" as const) : ("A" as const), goals: Math.random() < 0.4 ? 1 : null, assists: null })),
  );
}
await sql.end();
console.log("Seeded", ps.length, "players and 6 matches");
