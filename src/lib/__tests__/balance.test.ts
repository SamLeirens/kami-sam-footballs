import { describe, expect, it } from "vitest";
import { balanceTeams, type BalancePlayer } from "../balance";

const mk = (id: number, strength: number, position: BalancePlayer["position"] = "MID"): BalancePlayer => ({
  id,
  strength,
  position,
  attack: 5,
  defence: 5,
});

describe("balanceTeams", () => {
  it("splits 10 players 5v5 with minimal difference", () => {
    const ps = [9, 8, 7, 7, 6, 6, 5, 5, 4, 3].map((s, i) => mk(i + 1, s));
    const [best] = balanceTeams(ps);
    expect(best.teamA).toHaveLength(5);
    expect(best.teamB).toHaveLength(5);
    expect(best.diff).toBe(0); // total 60 → 30/30 is achievable
    expect(new Set([...best.teamA, ...best.teamB]).size).toBe(10);
  });

  it("handles odd numbers (5v6)", () => {
    const ps = Array.from({ length: 11 }, (_, i) => mk(i + 1, 4 + (i % 5)));
    const [best] = balanceTeams(ps);
    expect([best.teamA.length, best.teamB.length].sort()).toEqual([5, 6]);
  });

  it("returns 3 distinct options", () => {
    const ps = Array.from({ length: 12 }, (_, i) => mk(i + 1, 3 + ((i * 7) % 7)));
    const opts = balanceTeams(ps);
    expect(opts).toHaveLength(3);
    const keys = opts.map((o) => [...o.teamA].sort().join(","));
    expect(new Set(keys).size).toBe(3);
  });

  it("avoids repeating last week's teams when it's free to", () => {
    const ps = Array.from({ length: 10 }, (_, i) => mk(i + 1, 6));
    const previous = new Map<number, "A" | "B">(ps.map((p) => [p.id, p.id <= 5 ? "A" : "B"]));
    const [best] = balanceTeams(ps, { previous });
    const sameSide = best.teamA.filter((id) => id <= 5).length;
    expect(Math.max(sameSide, 5 - sameSide)).toBeLessThan(5);
  });

  it("solves 22 players exactly in reasonable time", () => {
    const ps = Array.from({ length: 22 }, (_, i) => mk(i + 1, 3 + ((i * 37) % 70) / 10));
    const t = performance.now();
    const [best] = balanceTeams(ps);
    expect(performance.now() - t).toBeLessThan(5000);
    expect(best.teamA.length + best.teamB.length).toBe(22);
    expect(best.diff).toBeLessThanOrEqual(0.2);
  });

  it("falls back to heuristic for very large groups", () => {
    const ps = Array.from({ length: 28 }, (_, i) => mk(i + 1, 3 + ((i * 13) % 70) / 10));
    const [best] = balanceTeams(ps);
    expect(best.teamA).toHaveLength(14);
    expect(best.diff).toBeLessThanOrEqual(0.5);
  });
});
