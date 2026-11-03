import { describe, expect, it } from "vitest";
import { validatePastMatch, type PastMatchInput } from "../pastMatch";

const base: PastMatchInput = {
  date: "2026-10-05",
  scoreA: 3,
  scoreB: 2,
  players: [
    { playerId: 1, team: "A", goals: 2, assists: null },
    { playerId: 2, team: "A", goals: null, assists: 1 },
    { playerId: 3, team: "B", goals: 2, assists: null },
  ],
  motmPlayerId: 1,
};
const v = (m: Partial<PastMatchInput>) => validatePastMatch({ ...base, ...m }, "2026-11-03");

describe("validatePastMatch", () => {
  it("accepts a complete match", () => expect(v({})).toBeNull());
  it("accepts unknown goals and no MOTM", () =>
    expect(v({ players: base.players.map((p) => ({ ...p, goals: null })), motmPlayerId: null })).toBeNull());
  it("rejects future dates", () => expect(v({ date: "2026-12-01" })).toMatch(/future/));
  it("needs both scores", () => expect(v({ scoreB: null })).toMatch(/score/));
  it("needs players on both teams", () => expect(v({ players: base.players.slice(0, 2) })).toMatch(/Orange/));
  it("goals can't exceed the score", () => expect(v({ scoreA: 1 })).toMatch(/Blue's players have 2 goals/));
  it("MOTM must have played", () => expect(v({ motmPlayerId: 9 })).toMatch(/Man of the match/));
});
