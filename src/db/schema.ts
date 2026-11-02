import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { Position } from "../lib/positions";

export { POSITIONS, type Position } from "../lib/positions";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").$type<Position>().notNull().default("MID"),
  active: boolean("active").notNull().default(true),
  // Current ratings, 1-10. History is kept in rating_history.
  attack: integer("attack").notNull().default(5),
  defence: integer("defence").notNull().default(5),
  passing: integer("passing").notNull().default(5),
  fitness: integer("fitness").notNull().default(5),
  goalkeeping: integer("goalkeeping").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ratingHistory = pgTable("rating_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  overall: real("overall").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  // null scores = not played yet
  scoreA: integer("score_a"),
  scoreB: integer("score_b"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchPlayers = pgTable(
  "match_players",
  {
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    team: text("team").$type<"A" | "B">().notNull(),
    // optional, null = unknown
    goals: integer("goals"),
    assists: integer("assists"),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  // How much recent results adjust the manual rating (0 = ignore results).
  formWeight: real("form_weight").notNull().default(1),
});

export type Player = typeof players.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
