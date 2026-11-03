import { describe, expect, it } from "vitest";
import { computeStats } from "../stats";
import { overall, strength } from "../rating";

describe("computeStats", () => {
  const matches = [
    { id: 1, date: "2026-01-01", scoreA: 3, scoreB: 1, motmPlayerId: 1 },
    { id: 2, date: "2026-01-08", scoreA: 2, scoreB: 2 },
    { id: 3, date: "2026-01-15", scoreA: null, scoreB: null }, // planned, ignored
  ];
  const entries = [
    { matchId: 1, playerId: 1, team: "A" as const, goals: 2, assists: null },
    { matchId: 1, playerId: 2, team: "B" as const, goals: null, assists: 1 },
    { matchId: 2, playerId: 1, team: "B" as const, goals: 1, assists: 1 },
    { matchId: 2, playerId: 2, team: "A" as const, goals: null, assists: null },
    { matchId: 3, playerId: 1, team: "A" as const, goals: null, assists: null },
  ];
  const stats = computeStats(matches, entries);

  it("counts W/D/L and win %", () => {
    expect(stats.get(1)).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, winPct: 50 });
    expect(stats.get(2)).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, winPct: 0 });
  });

  it("sums optional goals/assists, treating unknown as 0", () => {
    expect(stats.get(1)).toMatchObject({ goals: 3, assists: 1 });
    expect(stats.get(2)).toMatchObject({ goals: 0, assists: 1 });
  });

  it("counts man of the match awards", () => {
    expect(stats.get(1)!.motm).toBe(1);
    expect(stats.get(2)!.motm).toBe(0);
  });

  it("form is most recent first", () => {
    expect(stats.get(1)!.form).toEqual(["D", "W"]);
  });

  it("winners gain Elo, losers drop", () => {
    expect(stats.get(1)!.elo).toBeGreaterThan(1000);
    expect(stats.get(2)!.elo).toBeLessThan(1000);
  });
});

describe("rating", () => {
  it("overall averages attributes", () => {
    expect(overall({ attack: 8, defence: 6, passing: 7, fitness: 7 })).toBe(7);
  });
  it("strength nudges by Elo with cap", () => {
    expect(strength(6, 1100, 1)).toBe(7);
    expect(strength(6, 1600, 1)).toBe(8);
    expect(strength(6, 1100, 0)).toBe(6);
  });
});

import { effectiveMotm, tally } from "../motm";

describe("motm voting", () => {
  const v = (voterId: number, candidateId: number) => ({ matchId: 1, voterId, candidateId });
  it("leader is the most voted", () => {
    expect(tally([v(1, 5), v(2, 5), v(3, 6)]).leader).toBe(5);
  });
  it("tie or no votes = no leader", () => {
    expect(tally([v(1, 5), v(2, 6)]).leader).toBeNull();
    expect(tally([]).leader).toBeNull();
  });
  it("admin pick overrides the vote", () => {
    expect(effectiveMotm(9, [v(1, 5)])).toBe(9);
    expect(effectiveMotm(null, [v(1, 5)])).toBe(5);
  });
});

import { bestDuos, computePairs } from "../stats";

describe("pairs", () => {
  const matches = [
    { id: 1, date: "2026-01-01", scoreA: 2, scoreB: 0 },
    { id: 2, date: "2026-01-08", scoreA: 0, scoreB: 1 },
    { id: 3, date: "2026-01-15", scoreA: null, scoreB: null },
  ];
  const e = (matchId: number, playerId: number, team: "A" | "B") => ({ matchId, playerId, team, goals: null, assists: null });
  const entries = [
    e(1, 1, "A"), e(1, 2, "A"), e(1, 3, "B"),
    e(2, 1, "A"), e(2, 2, "B"), e(2, 3, "B"),
    e(3, 1, "A"), e(3, 2, "A"),
  ];
  const pairs = computePairs(matches, entries);

  it("records results with and against each teammate", () => {
    expect(pairs.get(1)!.get(2)).toEqual({
      with: { played: 1, wins: 1, draws: 0, losses: 0 },
      against: { played: 1, wins: 0, draws: 0, losses: 1 },
    });
    expect(pairs.get(2)!.get(3)!.with).toEqual({ played: 1, wins: 1, draws: 0, losses: 0 });
  });

  it("lists each duo once, best first", () => {
    const duos = bestDuos(pairs, 1);
    expect(duos.map((d) => `${d.a}-${d.b}`)).toEqual(["1-2", "2-3"]);
    expect(duos.every((d) => d.winPct === 100)).toBe(true);
  });
});

import { teamsText } from "../teams";

describe("teamsText", () => {
  it("writes the teams in Dutch", () => {
    expect(teamsText("2026-11-09", ["Jonas", "Milan"], ["Lucas"])).toBe(
      "⚽ Ploegen voor maandag 9 november\n\n🔵 *Blauw* (2)\n- Jonas\n- Milan\n\n🟠 *Oranje* (1)\n- Lucas",
    );
  });
});
