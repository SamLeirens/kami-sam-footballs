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

import type { Answer } from "../lib/poll";
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
  // man of the match (optional)
  // Man of the match picked by the admin. If null, the players' vote decides.
  motmPlayerId: integer("motm_player_id").references(() => players.id, { onDelete: "set null" }),
  // Public after-match page at /m/<shareToken>; null until the admin shares it.
  shareToken: text("share_token").unique(),
  votingOpen: boolean("voting_open").notNull().default(true),
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

// One MOTM vote per player per match (enforced by the primary key).
export const motmVotes = pgTable(
  "motm_votes",
  {
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    voterId: integer("voter_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.voterId] })],
);

// "Who's coming?" poll for an upcoming game day. Public page at /a/<token>.
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  token: text("token").notNull().unique(),
  open: boolean("open").notNull().default(true),
  // Set when teams are picked from this poll (that also closes it).
  matchId: integer("match_id").references(() => matches.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollReplies = pgTable(
  "poll_replies",
  {
    pollId: integer("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    answer: text("answer").$type<Answer>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.playerId] })],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  // How much recent results adjust the manual rating (0 = ignore results).
  formWeight: real("form_weight").notNull().default(1),
});

export type Player = typeof players.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type MotmVote = typeof motmVotes.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollReply = typeof pollReplies.$inferSelect;
