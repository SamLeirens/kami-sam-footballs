import { desc, eq } from "drizzle-orm";
import { TEAMS } from "@/lib/teams";
import { Star } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, ratingHistory } from "@/db";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PlayerForm } from "@/components/PlayerForm";
import { Form, formatDate, PosBadge, ResultChip, Stat } from "@/components/ui";
import { loadClub } from "@/lib/data";
import { isPlayed, resultFor, winPct, type Record3 } from "@/lib/stats";
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

  // Win % with / against each other player
  const MIN = 3;
  const mates = [...(club.pairs.get(id) ?? new Map()).entries()]
    .map(([otherId, r]) => ({ other: club.players.find((x) => x.id === otherId)!, ...r }))
    .filter((r) => r.other)
    .sort(
      (a, b) =>
        Number(b.with.played >= MIN) - Number(a.with.played >= MIN) ||
        winPct(b.with) - winPct(a.with) ||
        b.with.played - a.with.played,
    );
  const bestPartner = mates.find((m) => m.with.played >= MIN);
  const nemesis = [...mates]
    .filter((m) => m.against.played >= MIN)
    .sort((a, b) => winPct(a.against) - winPct(b.against) || b.against.played - a.against.played)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/players" className="text-sm text-muted hover:underline">← Players</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">{p.name}</h1>
        <PosBadge position={p.position} />
        {!p.active && <span className="rounded bg-surface-2 px-2 py-0.5 text-xs">inactive</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rating" value={p.overall.toFixed(1)} sub={`Strength ${p.strength.toFixed(1)} · Elo ${s.elo}`} />
        <Stat label="Win %" value={s.played ? `${s.winPct}%` : "–"} sub={`${s.wins}W ${s.draws}D ${s.losses}L`} />
        <Stat label="Played" value={s.played} sub={<Form form={s.form} />} />
        <Stat label="Goals / Assists" value={`${s.goals} / ${s.assists}`} sub={s.motm ? `${s.motm}× man of the match` : s.played ? `${(s.goals / s.played).toFixed(2)} goals per game` : undefined} />
      </div>

      <section className="card">
        <h2 className="h2 mb-4">Edit ratings</h2>
        <PlayerForm action={updatePlayer.bind(null, id)} initial={p} submitLabel="Save" showActive />
      </section>

      {mates.length > 0 && (
        <section className="card">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="h2">Teammates & opponents</h2>
            <span className="text-xs text-muted">{p.name}&apos;s results with and against each player</span>
          </div>
          {(bestPartner || nemesis) && (
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              {bestPartner && (
                <span className="rounded-full bg-accent-dim px-3 py-1 text-accent">
                  Best partner: <b>{bestPartner.other.name}</b> ({winPct(bestPartner.with)}% in {bestPartner.with.played})
                </span>
              )}
              {nemesis && (
                <span className="rounded-full bg-danger-dim px-3 py-1 text-danger">
                  Toughest opponent: <b>{nemesis.other.name}</b> ({winPct(nemesis.against)}% against in {nemesis.against.played})
                </span>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-1 text-left">Player</th>
                  <th className="px-2 py-1 text-right" colSpan={2}>Together</th>
                  <th className="px-2 py-1 text-right" colSpan={2}>Against</th>
                </tr>
              </thead>
              <tbody>
                {mates.map((m) => (
                  <tr key={m.other.id} className="border-t border-line-soft">
                    <td className="py-1.5">
                      <Link href={`/players/${m.other.id}`} className="hover:underline">{m.other.name}</Link>
                    </td>
                    <PairCells r={m.with} min={MIN} />
                    <PairCells r={m.against} min={MIN} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Win % is {p.name}&apos;s. Greyed out = fewer than {MIN} games, so take it with a pinch of salt.</p>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-3">Matches</h2>
          {myMatches.length === 0 ? (
            <p className="text-sm text-muted">No matches yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft text-sm">
              {myMatches.map((m) => {
                const e = myEntries.get(m.id)!;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    {isPlayed(m) ? <ResultChip r={resultFor(m, e.team)} /> : <span className="w-5 text-center text-muted">·</span>}
                    <Link href={`/matches/${m.id}`} className="flex-1 hover:underline">{formatDate(m.date)}</Link>
                    <span className={TEAMS[e.team].text}>{TEAMS[e.team].name}</span>
                    <span className="w-12 text-right font-mono">{isPlayed(m) ? `${m.scoreA}–${m.scoreB}` : "—"}</span>
                    {m.motmId === id && <Star className="text-accent" size={13} />}
                    {(e.goals ?? 0) > 0 && <span className="text-xs text-muted">{e.goals}G</span>}
                    {(e.assists ?? 0) > 0 && <span className="text-xs text-muted">{e.assists}A</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="h2 mb-3">Rating history</h2>
          <ul className="divide-y divide-line-soft text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span className="text-muted">{h.createdAt.toISOString().slice(0, 10)}</span>
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

function PairCells({ r, min }: { r: Record3; min: number }) {
  if (!r.played) return <td className="px-2 py-1.5 text-right text-subtle" colSpan={2}>–</td>;
  const pct = winPct(r);
  const color = r.played < min ? "text-muted" : pct >= 60 ? "text-accent" : pct <= 40 ? "text-danger" : "";
  return (
    <>
      <td className="px-2 py-1.5 text-right text-xs tabular-nums text-muted" title={`${r.wins}W ${r.draws}D ${r.losses}L`}>
        {r.wins}-{r.draws}-{r.losses}
      </td>
      <td className={`w-14 px-2 py-1.5 text-right font-semibold tabular-nums ${color}`}>{pct}%</td>
    </>
  );
}
