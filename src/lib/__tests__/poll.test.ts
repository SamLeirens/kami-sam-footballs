import { describe, expect, it } from "vitest";
import { groupReplies, inviteText, nextGameDate, reminderText } from "../poll";

const players = [
  { id: 1, name: "Arne" },
  { id: 2, name: "Bram" },
  { id: 3, name: "Cas" },
  { id: 4, name: "Dries" },
];

describe("groupReplies", () => {
  it("splits players by answer and keeps their order", () => {
    const g = groupReplies(players, [
      { playerId: 3, answer: "in" },
      { playerId: 1, answer: "in" },
      { playerId: 2, answer: "out" },
      { playerId: 99, answer: "in" }, // inactive/unknown player: ignored
    ]);
    expect(g.in.map((p) => p.name)).toEqual(["Arne", "Cas"]);
    expect(g.out.map((p) => p.name)).toEqual(["Bram"]);
    expect(g.maybe).toEqual([]);
    expect(g.none.map((p) => p.name)).toEqual(["Dries"]);
  });
});

describe("messages", () => {
  it("invite is Dutch and ends with the link", () => {
    const t = inviteText("2026-11-05", "https://x.app/a/abc");
    expect(t).toContain("donderdag 5 november");
    expect(t.endsWith("https://x.app/a/abc")).toBe(true);
  });

  it("reminder lists who hasn't replied", () => {
    const g = groupReplies(players, [{ playerId: 1, answer: "in" }, { playerId: 2, answer: "maybe" }]);
    const t = reminderText("2026-11-05", "U", g);
    expect(t).toContain("al 1 erbij");
    expect(t).toContain("Nog niet geantwoord: Cas, Dries");
    expect(t.endsWith("👉 U")).toBe(true);
  });

  it("reminder skips the list when everyone replied", () => {
    const g = groupReplies(players.slice(0, 1), [{ playerId: 1, answer: "in" }]);
    expect(reminderText("2026-11-05", "U", g)).not.toContain("Nog niet");
  });
});

describe("nextGameDate", () => {
  // 2026-11-03 is a Tuesday
  it("picks the next day on the last match's weekday", () => {
    expect(nextGameDate("2026-10-29", "2026-11-03")).toBe("2026-11-05"); // Thursday
    expect(nextGameDate("2026-10-27", "2026-11-03")).toBe("2026-11-10"); // Tuesday → next week
    expect(nextGameDate("2026-11-01", "2026-11-03")).toBe("2026-11-08"); // Sunday
  });

  it("goes past a match that is already planned", () => {
    expect(nextGameDate("2026-11-10", "2026-11-03")).toBe("2026-11-17");
  });

  it("defaults to a week from today without matches", () => {
    expect(nextGameDate(null, "2026-11-03")).toBe("2026-11-10");
  });
});
