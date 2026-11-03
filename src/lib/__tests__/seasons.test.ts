import { describe, expect, it } from "vitest";
import { currentSeason, inRange, resolveSeason, seasonRanges } from "../seasons";

const ranges = seasonRanges([
  { id: 2, name: "26/27", startDate: "2026-09-01" },
  { id: 1, name: "25/26", startDate: "2025-09-01" },
]);

describe("seasons", () => {
  it("each season ends where the next begins", () => {
    expect(ranges).toEqual([
      { id: 1, name: "25/26", start: "2025-09-01", end: "2026-09-01" },
      { id: 2, name: "26/27", start: "2026-09-01", end: null },
    ]);
    expect(inRange("2026-08-31", ranges[0])).toBe(true);
    expect(inRange("2026-09-01", ranges[0])).toBe(false);
  });
  it("finds the current season", () => {
    expect(currentSeason(ranges, "2026-11-03")?.id).toBe(2);
    expect(currentSeason(ranges, "2024-01-01")).toBeNull();
  });
  it("resolves the season param", () => {
    expect(resolveSeason(ranges, undefined, "2026-11-03")?.id).toBe(2);
    expect(resolveSeason(ranges, "all", "2026-11-03")).toBeNull();
    expect(resolveSeason(ranges, "1", "2026-11-03")?.name).toBe("25/26");
  });
});
