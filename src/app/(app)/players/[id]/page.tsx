import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, ratingHistory } from "@/db";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PlayerForm } from "@/components/PlayerForm";
import { Form, formatDate, PosBadge, ResultChip, Stat } from "@/components/ui";
import { loadClub } from "@/lib/data";
import { isPlayed, resultFor } from "@/lib/stats";
import { deletePlayer, updatePlayer } from "../actions";

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const id = Number((await params).id);
  const club = await loadClub();
  const p = club.players.find((x) => x.id === id);
  if (!p) notFound();

  const history = await db
    .select()
    .from(ratingHistory)
    .where(eq(ratingHistory.playerId, id))
    .orderBy(desc(ratingHistory.createdAt))
    .limit(10);

  const myEntries = new Map(club.entries.filter((e) => e.playerId === id).map((e) => [e.matchId, e]));
  const myMatches = club.matches.filter((m) => myEntries.has(m.id));
  const s = p.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/players" className="text-sm text-neutral-500 hover:underline">← Players</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">{p.name}</h1>
        <PosBadge position={p.position} />
        {!p.active && <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs">inactive</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rating" value={p.overall.toFixed(1)} sub={`Strength ${p.strength.toFixed(1)} · Elo ${s.elo}`} />
        <Stat label="Win %" value={s.played ? `${s.winPct}%` : "–"} sub={`${s.wins}W ${s.draws}D ${s.losses}L`} />
        <Stat label="Played" value={s.played} sub={<Form form={s.form} />} />
        <Stat label="Goals / Assists" value={`${s.goals} / ${s.assists}`} sub={s.motm ? `⭐ ${s.motm}× man of the match` : s.played ? `${(s.goals / s.played).toFixed(2)} goals per game` : undefined} />
      </div>

      <section className="card">
        <h2 className="h2 mb-4">Edit ratings</h2>
        <PlayerForm action={updatePlayer.bind(null, id)} initial={p} submitLabel="Save" showActive />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-3">Matches</h2>
          {myMatches.length === 0 ? (
            <p className="text-sm text-neutral-500">No matches yet.</p>
          ) : (
            <ul className="divide-y divide-black/5 text-sm">
              {myMatches.map((m) => {
                const e = myEntries.get(m.id)!;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    {isPlayed(m) ? <ResultChip r={resultFor(m, e.team)} /> : <span className="w-5 text-center text-neutral-400">·</span>}
                    <Link href={`/matches/${m.id}`} className="flex-1 hover:underline">{formatDate(m.date)}</Link>
                    <span className="text-neutral-500">Team {e.team}</span>
                    <span className="w-12 text-right font-mono">{isPlayed(m) ? `${m.scoreA}–${m.scoreB}` : "—"}</span>
                    {m.motmPlayerId === id && <span title="Man of the match">⭐</span>}
                    {(e.goals ?? 0) > 0 && <span title="goals">⚽{e.goals}</span>}
                    {(e.assists ?? 0) > 0 && <span title="assists">🅰️{e.assists}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="h2 mb-3">Rating history</h2>
          <ul className="divide-y divide-black/5 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span className="text-neutral-500">{h.createdAt.toISOString().slice(0, 10)}</span>
                <span className="font-semibold tabular-nums">{h.overall.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <form>
        <ConfirmButton
          message={`Delete ${p.name}? This removes them from all match history too. Consider marking them inactive instead.`}
          formAction={deletePlayer.bind(null, id)}
        >
          Delete player
        </ConfirmButton>
      </form>
    </div>
  );
}
