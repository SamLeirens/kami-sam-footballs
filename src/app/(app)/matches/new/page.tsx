import Link from "next/link";
import { loadClub } from "@/lib/data";
import { TeamPicker } from "./TeamPicker";

export default async function NewMatchPage({ searchParams }: PageProps<"/matches/new">) {
  const sp = await searchParams;
  const { players, matches, entries, rsvps } = await loadClub();
  const active = players.filter((p) => p.active);

  // Picking teams for a planned match (?match=ID)?
  const planned = sp.match ? matches.find((m) => m.id === Number(sp.match)) : undefined;
  const lineupOf = (id: number) => entries.filter((e) => e.matchId === id);

  // Most recent other match with teams, so the generator can avoid repeating them.
  const last = matches.find((m) => m.id !== planned?.id && lineupOf(m.id).length > 0);
  const previous: Record<number, "A" | "B"> = {};
  if (last) for (const e of lineupOf(last.id)) previous[e.playerId] = e.team;

  let preselected = Object.keys(previous).map(Number); // default: whoever played last time
  let squadNote: string | undefined;
  if (planned) {
    const lineup = lineupOf(planned.id);
    const replies = rsvps.filter((r) => r.matchId === planned.id);
    if (lineup.length) {
      preselected = lineup.map((e) => e.playerId);
      squadNote = "Ticked: the current line-up.";
    } else {
      preselected = replies.filter((r) => r.status === "in").map((r) => r.playerId);
      const outs = replies.filter((r) => r.status === "out").length;
      const maybes = replies.filter((r) => r.status === "maybe").map((r) => players.find((p) => p.id === r.playerId)?.name).filter(Boolean);
      squadNote = `Ticked: the ${preselected.length} who said they're in${outs ? ` (${outs} said they're out)` : ""}.`;
      if (maybes.length) squadNote += ` Maybe: ${maybes.join(", ")}.`;
    }
  }

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
        isGuest: p.isGuest,
      }))}
      previous={previous}
      preselected={preselected}
      matchId={planned?.id}
      initialDate={planned?.date}
      squadNote={squadNote}
    />
  );
}
