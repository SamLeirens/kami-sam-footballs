import Link from "next/link";
import { loadClub } from "@/lib/data";
import { TeamPicker } from "./TeamPicker";

export default async function NewMatchPage() {
  const { players, matches, entries } = await loadClub();
  const active = players.filter((p) => p.active);

  // Most recent match's teams, so the generator can avoid repeating them.
  const last = matches[0];
  const previous: Record<number, "A" | "B"> = {};
  if (last) for (const e of entries) if (e.matchId === last.id) previous[e.playerId] = e.team;
  // Pre-tick whoever played last time.
  const lastPlayers = Object.keys(previous).map(Number);

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
      preselected={lastPlayers}
    />
  );
}
