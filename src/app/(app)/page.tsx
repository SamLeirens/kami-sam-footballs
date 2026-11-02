import Link from "next/link";
import { Form, formatDate, Stat } from "@/components/ui";
import { loadClub, type PlayerRow } from "@/lib/data";
import { isPlayed } from "@/lib/stats";

const MIN_GAMES = 3;

export default async function Dashboard() {
  const { players, matches, entries } = await loadClub();
  const playedMatches = matches.filter(isPlayed);
  const planned = matches.filter((m) => !isPlayed(m));
  const next = planned.at(-1); // matches are newest first; the earliest planned one
  const last = playedMatches[0];
  const count = (matchId: number) => entries.filter((e) => e.matchId === matchId).length;
  const totalGoals = playedMatches.reduce((s, m) => s + m.scoreA + m.scoreB, 0);

  const qualified = players.filter((p) => p.stats.played >= MIN_GAMES);
  const topWin = [...qualified].sort((a, b) => b.stats.winPct - a.stats.winPct || b.stats.played - a.stats.played).slice(0, 5);
  const topMotm = players.filter((p) => p.stats.motm > 0).sort((a, b) => b.stats.motm - a.stats.motm || a.stats.played - b.stats.played).slice(0, 5);
  const motmName = (id: number | null) => players.find((p) => p.id === id)?.name;
  const topScorers = players.filter((p) => p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 5);

  if (players.length === 0) {
    return (
      <div className="card mx-auto max-w-md space-y-3 text-center">
        <h1 className="h1">Welcome 👋</h1>
        <p className="text-sm text-neutral-600">Start by adding your players and rating them.</p>
        <Link href="/players" className="btn">Add players</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Dashboard</h1>
        <Link href="/matches/new" className="btn">⚽ Pick teams</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active players" value={players.filter((p) => p.active).length} />
        <Stat label="Matches played" value={playedMatches.length} />
        <Stat label="Goals scored" value={totalGoals} sub={playedMatches.length ? `${(totalGoals / playedMatches.length).toFixed(1)} per match` : undefined} />
        <Stat label="Draws" value={playedMatches.filter((m) => m.scoreA === m.scoreB).length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {next && (
          <Link href={`/matches/${next.id}`} className="card block border-l-4 border-l-amber-500 hover:bg-amber-50/40">
            <div className="label">Next match</div>
            <div className="text-lg font-semibold">{formatDate(next.date)}</div>
            <div className="text-sm text-neutral-500">{count(next.id)} players · enter result →</div>
          </Link>
        )}
        {last && (
          <Link href={`/matches/${last.id}`} className="card block border-l-4 border-l-pitch-600 hover:bg-pitch-50/40">
            <div className="label">Last result</div>
            <div className="text-lg font-semibold">
              Team A <span className="font-mono">{last.scoreA} – {last.scoreB}</span> Team B
            </div>
            <div className="text-sm text-neutral-500">
              {formatDate(last.date)}
              {motmName(last.motmId) && <> · ⭐ {motmName(last.motmId)}</>}
            </div>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Leaderboard
          title="Best win %"
          empty={`Players need ${MIN_GAMES}+ games to appear here.`}
          rows={topWin}
          value={(p) => `${p.stats.winPct}%`}
          extra={(p) => <Form form={p.stats.form} />}
        />
        <Leaderboard
          title="Top scorers"
          empty="No goals recorded yet."
          rows={topScorers}
          value={(p) => p.stats.goals}
          extra={(p) => <span className="text-xs text-neutral-500">{p.stats.played} games</span>}
        />
        <Leaderboard
          title="⭐ Man of the match"
          empty="No awards yet."
          rows={topMotm}
          value={(p) => `${p.stats.motm}×`}
          extra={(p) => <span className="text-xs text-neutral-500">{p.stats.played} games</span>}
        />
      </div>
      <div className="text-right">
        <Link href="/stats" className="text-sm font-medium text-pitch-700 hover:underline">All stats →</Link>
      </div>
    </div>
  );
}

function Leaderboard({
  title,
  rows,
  value,
  extra,
  empty,
}: {
  title: string;
  rows: PlayerRow[];
  value: (p: PlayerRow) => React.ReactNode;
  extra: (p: PlayerRow) => React.ReactNode;
  empty: string;
}) {
  return (
    <section className="card">
      <h2 className="h2 mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">{empty}</p>
      ) : (
        <ol className="divide-y divide-black/5 text-sm">
          {rows.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <span className="w-4 text-neutral-400">{i + 1}</span>
              <Link href={`/players/${p.id}`} className="flex-1 hover:underline">{p.name}</Link>
              {extra(p)}
              <span className="w-12 text-right font-bold tabular-nums">{value(p)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
