// The two sides are always our shirt colours. Stored as "A"/"B" in the database.
export const TEAMS = {
  A: { name: "Blue", nl: "Blauw", emoji: "🔵", text: "text-team-a", bg: "bg-team-a", borderTop: "border-t-team-a" },
  B: { name: "Orange", nl: "Oranje", emoji: "🟠", text: "text-team-b", bg: "bg-team-b", borderTop: "border-t-team-b" },
} as const;

export type TeamKey = keyof typeof TEAMS;
export const other = (t: TeamKey): TeamKey => (t === "A" ? "B" : "A");

/** Dutch message listing both teams, ready to paste in the group chat. */
export function teamsText(date: string, blue: string[], orange: string[]) {
  const day = new Date(date + "T12:00:00Z").toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const block = (t: TeamKey, names: string[]) =>
    `${TEAMS[t].emoji} *${TEAMS[t].nl}* (${names.length})\n${names.map((n) => `- ${n}`).join("\n")}`;
  return `⚽ Ploegen voor ${day}\n\n${block("A", blue)}\n\n${block("B", orange)}`;
}
