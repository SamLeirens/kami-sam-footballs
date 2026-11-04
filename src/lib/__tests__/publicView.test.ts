import { describe, expect, it } from "vitest";
import { toPublicPlayer } from "../publicView";
import { emptyStats } from "../stats";

describe("toPublicPlayer", () => {
  it("never exposes ratings, strength or Elo", () => {
    const admin = {
      id: 1, name: "Sam", active: true, isGuest: false, position: "MID",
      attack: 9, defence: 3, passing: 7, fitness: 8, overall: 6.8, strength: 7.1,
      createdAt: new Date(),
      stats: { ...emptyStats(), played: 4, winPct: 75, goals: 2, motm: 1, elo: 1042 },
    };
    const pub = toPublicPlayer(admin);
    expect(pub).toEqual({ id: 1, name: "Sam", active: true, isGuest: false, stats: { played: 4, winPct: 75, goals: 2, motm: 1 } });
    const json = JSON.stringify(pub);
    for (const key of ["attack", "defence", "passing", "fitness", "overall", "strength", "elo", "position"]) {
      expect(json).not.toContain(key);
    }
  });
});
