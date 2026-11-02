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

  return (
    <div className="space-y-6">
      <h1 className="h1">Pick teams</h1>
      {active.length < 2 ? (
        <p className="card text-sm text-neutral-600">Add some players first.</p>
      ) : (
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
      )}
    </div>
  );
}
