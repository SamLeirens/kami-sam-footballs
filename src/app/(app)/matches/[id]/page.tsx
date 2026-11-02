import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate, PosBadge } from "@/components/ui";
import { loadClub, type PlayerRow } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import { addToMatch, deleteMatch, removeFromMatch, saveResult, switchTeam } from "../actions";

export default async function MatchPage({ params }: PageProps<"/matches/[id]">) {
  const id = Number((await params).id);
  const club = await loadClub();
  const match = club.matches.find((m) => m.id === id);
  if (!match) notFound();

  const byId = new Map(club.players.map((p) => [p.id, p]));
  const lineup = club.entries
    .filter((e) => e.matchId === id)
    .map((e) => ({ ...e, player: byId.get(e.playerId)! }))
    .filter((e) => e.player)
    .sort((a, b) => b.player.strength - a.player.strength);
  const teams = { A: lineup.filter((e) => e.team === "A"), B: lineup.filter((e) => e.team === "B") };
  const total = (t: typeof lineup) => t.reduce((s, e) => s + e.player.strength, 0);
  const inMatch = new Set(lineup.map((e) => e.playerId));
  const available = club.players.filter((p) => p.active && !inMatch.has(p.id));
  const played = isPlayed(match);

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-neutral-500 hover:underline">← Matches</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="h1">{formatDate(match.date)}</h1>
        {played ? (
          <span className="rounded bg-pitch-100 px-2 py-0.5 text-xs font-semibold text-pitch-800">Played</span>
        ) : (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Planned</span>
        )}
      </div>

      <form action={saveResult.bind(null, id)} className="space-y-4">
        <section className="card">
          <h2 className="h2 mb-3">Result</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <div>
                <label className="label text-pitch-700" htmlFor="scoreA">Team A</label>
                <input id="scoreA" name="scoreA" type="number" min={0} inputMode="numeric" defaultValue={match.scoreA ?? ""} className="input w-20 text-center text-xl font-bold" />
              </div>
              <span className="mt-5 text-xl font-bold text-neutral-400">–</span>
              <div>
                <label className="label text-sky-700" htmlFor="scoreB">Team B</label>
                <input id="scoreB" name="scoreB" type="number" min={0} inputMode="numeric" defaultValue={match.scoreB ?? ""} className="input w-20 text-center text-xl font-bold" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" name="date" type="date" defaultValue={match.date} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="motm">⭐ Man of the match</label>
              <select key={match.motmPlayerId ?? "none"} id="motm" name="motm" defaultValue={match.motmPlayerId ?? ""} className="input">
                <option value="">—</option>
                {(["A", "B"] as const).map((t) => (
                  <optgroup key={t} label={`Team ${t}`}>
                    {teams[t].map((e) => (
                      <option key={e.playerId} value={e.playerId}>{e.player.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="min-w-48 flex-1">
              <label className="label" htmlFor="notes">Notes</label>
              <input id="notes" name="notes" defaultValue={match.notes ?? ""} className="input" placeholder="optional" />
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Goals and assists below are optional — leave blank if you don&apos;t know.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((t) => (
            <section key={t} className={`card border-t-4 ${t === "A" ? "border-t-pitch-600" : "border-t-sky-600"}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="h2">Team {t} <span className="text-sm font-normal text-neutral-500">({teams[t].length})</span></h2>
                <span className="text-sm text-neutral-500">strength {total(teams[t]).toFixed(1)}</span>
              </div>
              <div className="mb-1 grid grid-cols-[auto_1fr_3rem_3rem_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                <span className="w-9" /><span /><span className="text-center">Goals</span><span className="text-center">Ast</span><span className="w-16" />
              </div>
              <ul className="space-y-1">
                {teams[t].map((e) => (
                  <LineupRow key={e.playerId} matchId={id} player={e.player} team={t} goals={e.goals} assists={e.assists} motm={match.motmPlayerId === e.playerId} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn">Save result</button>
          <ConfirmButton message="Delete this match?" formAction={deleteMatch.bind(null, id)}>
            Delete match
          </ConfirmButton>
        </div>
      </form>

      {available.length > 0 && (
        <form action={addToMatch.bind(null, id)} className="card flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label className="label" htmlFor="playerId">Add a late arrival</label>
            <select id="playerId" name="playerId" className="input" defaultValue="">
              <option value="" disabled>Choose player…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.strength.toFixed(1)})</option>
              ))}
            </select>
          </div>
          <select name="team" className="input w-auto" defaultValue={teams.A.length <= teams.B.length ? "A" : "B"}>
            <option value="A">Team A</option>
            <option value="B">Team B</option>
          </select>
          <button className="btn-secondary">Add</button>
        </form>
      )}
    </div>
  );
}

function LineupRow({
  matchId,
  player,
  team,
  goals,
  assists,
  motm,
}: {
  matchId: number;
  player: PlayerRow;
  team: "A" | "B";
  goals: number | null;
  assists: number | null;
  motm: boolean;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr_3rem_3rem_auto] items-center gap-2 text-sm">
      <PosBadge position={player.position} />
      <Link href={`/players/${player.id}`} className="truncate hover:underline">
        {player.name}
        {motm && <span className="ml-1" title="Man of the match">⭐</span>}
      </Link>
      <input name={`goals_${player.id}`} type="number" min={0} inputMode="numeric" defaultValue={goals ?? ""} className="input px-1 py-1 text-center" aria-label={`${player.name} goals`} />
      <input name={`assists_${player.id}`} type="number" min={0} inputMode="numeric" defaultValue={assists ?? ""} className="input px-1 py-1 text-center" aria-label={`${player.name} assists`} />
      <span className="flex w-16 justify-end">
        <button formAction={switchTeam.bind(null, matchId, player.id)} className="rounded px-2 py-1 text-neutral-500 hover:bg-black/5" title={`Move to team ${team === "A" ? "B" : "A"}`}>⇄</button>
        <button formAction={removeFromMatch.bind(null, matchId, player.id)} className="rounded px-2 py-1 text-neutral-400 hover:bg-red-50 hover:text-red-600" title="Remove from match">✕</button>
      </span>
    </li>
  );
}
