// "Are you playing?" replies. Pure helpers, safe on client and server.
import { dayNl } from "./teams";

export const RSVP_STATUSES = ["in", "maybe", "out"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const isRsvpStatus = (v: unknown): v is RsvpStatus => RSVP_STATUSES.includes(v as RsvpStatus);

/** Dutch message for the group chat asking who's playing. */
export function inviteText(date: string, url: string) {
  return `⚽ Wie komt er voetballen op ${dayNl(date)}?\nLaat het weten via deze link 👇\n${url}`;
}

/** Dutch reminder with the count so far and who hasn't answered yet. */
export function reminderText(date: string, url: string, inCount: number, waiting: string[]) {
  const lines = [`⏰ Voetbal op ${dayNl(date)}: al ${inCount} erbij ✅`];
  if (waiting.length) lines.push(`Nog niet geantwoord: ${waiting.join(", ")}`);
  lines.push(`👉 ${url}`);
  return lines.join("\n");
}

const DAY = 86_400_000;
const toDate = (s: string) => new Date(s + "T00:00:00Z");
const toStr = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Suggested date for the next game: the first day on the last match's weekday
 * after both today and that match (it may be planned ahead). Without matches, one week from today.
 */
export function nextGameDate(lastMatchDate: string | null, today: string) {
  const t = toDate(lastMatchDate && lastMatchDate > today ? lastMatchDate : today);
  if (!lastMatchDate) return toStr(new Date(t.getTime() + 7 * DAY));
  const diff = (toDate(lastMatchDate).getUTCDay() - t.getUTCDay() + 7) % 7 || 7;
  return toStr(new Date(t.getTime() + diff * DAY));
}
