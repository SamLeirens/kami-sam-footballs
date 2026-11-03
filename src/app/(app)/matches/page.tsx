import Link from "next/link";
import { Star } from "@/components/icons";
import { formatDate } from "@/components/ui";
import { loadClub, todayISO } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import { TEAMS } from "@/lib/teams";
import { planMatch } from "./actions";

export default async function MatchesPage() {
  const { matches, entries, players, rsvps } = await loadClub();
  const names = new Map(players.map((p) => [p.id, p.name]));
  const counts = new Map<number, number>();
  for (const e of entries) counts.set(e.matchId, (counts.get(e.matchId) ?? 0) + 1);
  const ins = new Map<number, number>();
  for (const r of rsvps) if (r.status === "in") ins.set(r.matchId, (ins.get(r.matchId) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">Matches</h1>
        <div className="flex gap-2">
          <Link href="/matches/past" className="btn-secondary">Add past match</Link>
          <Link href="/matches/new" className="btn">Pick teams</Link>
        </div>
      </div>

      <form action={planMatch} className="card flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1">
          <label className="label" htmlFor="plan-date">Plan a match &amp; ask who&apos;s in</label>
          <input id="plan-date" name="date" type="date" required className="input" defaultValue={todayISO()} />
        </div>
        <button className="btn-secondary">Plan match</button>
      </form>

      {matches.length === 0 ? (
        <p className="card text-sm text-muted">No matches yet.</p>
      ) : (
        <ul className="card divide-y divide-line-soft p-0">
          {matches.map((m) => {
            const lineup = counts.get(m.id) ?? 0;
            return (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="flex-1 font-medium">{formatDate(m.date)}</span>
                  {m.motmId && names.has(m.motmId) && (
                    <span className="hidden items-center gap-1 text-sm text-muted sm:inline-flex">
                      <Star className="text-accent" size={13} /> {names.get(m.motmId)}
                    </span>
                  )}
                  <span className="text-sm text-muted">
                    {lineup ? `${lineup} players` : `${ins.get(m.id) ?? 0} in`}
                  </span>
                  {isPlayed(m) ? (
                    <span className="num w-16 text-right text-xl">
                      <span className={TEAMS.A.text}>{m.scoreA}</span>–<span className={TEAMS.B.text}>{m.scoreB}</span>
                    </span>
                  ) : (
                    <span className="w-16 text-right text-xs font-semibold text-warn uppercase">{lineup ? "Teams set" : "Asking"}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
