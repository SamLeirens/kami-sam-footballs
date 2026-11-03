import { describe, expect, it } from "vitest";
import { inviteText, isRsvpStatus, nextGameDate, reminderText } from "../rsvp";

describe("isRsvpStatus", () => {
  it("accepts in / maybe / out only", () => {
    expect(["in", "maybe", "out"].every(isRsvpStatus)).toBe(true);
    expect(isRsvpStatus("yes")).toBe(false);
    expect(isRsvpStatus(null)).toBe(false);
  });
});

describe("messages", () => {
  it("invite is Dutch and ends with the link", () => {
    const t = inviteText("2026-11-05", "https://x.app/m/abc");
    expect(t).toContain("donderdag 5 november");
    expect(t.endsWith("https://x.app/m/abc")).toBe(true);
  });

  it("reminder lists who hasn't replied", () => {
    const t = reminderText("2026-11-05", "U", 1, ["Cas", "Dries"]);
    expect(t).toContain("al 1 erbij");
    expect(t).toContain("Nog niet geantwoord: Cas, Dries");
    expect(t.endsWith("👉 U")).toBe(true);
  });

  it("reminder skips the list when everyone replied", () => {
    expect(reminderText("2026-11-05", "U", 10, [])).not.toContain("Nog niet");
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
