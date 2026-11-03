// "Who's coming?" poll helpers. Pure functions, safe to use on client and server.
import { dayNl } from "./teams";

export const ANSWERS = ["in", "maybe", "out"] as const;
export type Answer = (typeof ANSWERS)[number];

export const isAnswer = (v: unknown): v is Answer => ANSWERS.includes(v as Answer);

export const ANSWER_LABEL: Record<Answer, { short: string; button: string; emoji: string }> = {
  in: { short: "In", button: "I'm in", emoji: "✅" },
  maybe: { short: "Maybe", button: "Maybe", emoji: "🤔" },
  out: { short: "Out", button: "Can't", emoji: "❌" },
};

type Named = { id: number; name: string };
export type Groups<P extends Named> = Record<Answer | "none", P[]>;

/** Splits players by their answer; "none" = hasn't replied yet. Keeps the players' order. */
export function groupReplies<P extends Named>(players: P[], replies: { playerId: number; answer: Answer }[]): Groups<P> {
  const byPlayer = new Map(replies.map((r) => [r.playerId, r.answer]));
  const groups: Groups<P> = { in: [], maybe: [], out: [], none: [] };
  for (const p of players) groups[byPlayer.get(p.id) ?? "none"].push(p);
  return groups;
}

/** Dutch message for the group chat asking who's coming. */
export function inviteText(date: string, url: string) {
  return `⚽ Wie komt er voetballen op ${dayNl(date)}?\nLaat het weten via deze link 👇\n${url}`;
}

/** Dutch reminder listing who hasn't answered yet. */
export function reminderText(date: string, url: string, groups: Groups<Named>) {
  const lines = [`⏰ Voetbal op ${dayNl(date)}: al ${groups.in.length} erbij ✅`];
  if (groups.none.length) lines.push(`Nog niet geantwoord: ${groups.none.map((p) => p.name).join(", ")}`);
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
