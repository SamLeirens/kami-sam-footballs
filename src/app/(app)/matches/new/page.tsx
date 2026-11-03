import Link from "next/link";
import { getOpenPoll, loadClub } from "@/lib/data";
import { TeamPicker } from "./TeamPicker";

export default async function NewMatchPage() {
  const [{ players, matches, entries }, poll] = await Promise.all([loadClub(), getOpenPoll()]);
  const active = players.filter((p) => p.active);

  // Most recent match's teams, so the generator can avoid repeating them.
  const last = matches[0];
  const previous: Record<number, "A" | "B"> = {};
  if (last) for (const e of entries) if (e.matchId === last.id) previous[e.playerId] = e.team;
  // Pre-tick who said they're in; without replies, whoever played last time.
  const lastPlayers = Object.keys(previous).map(Number);
  const answers = Object.fromEntries((poll?.replies ?? []).map((r) => [r.playerId, r.answer]));
  const pollIn = poll?.replies.filter((r) => r.answer === "in").map((r) => r.playerId) ?? [];

  if (active.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="h1">Pick teams</h1>
        <p className="card text-sm text-muted">
          Add some players first. <Link href="/players" className="font-semibold text-accent">Go to players</Link>
        </p>
      </div>
    );
  }

  return (
    <TeamPicker
      players={active.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        strength: p.strength,
        attack: p.attack,
        defence: p.defence,
      }))}
      previous={previous}
      preselected={pollIn.length ? pollIn : lastPlayers}
      poll={poll ? { id: poll.id, date: poll.date, answers } : null}
    />
  );
}
