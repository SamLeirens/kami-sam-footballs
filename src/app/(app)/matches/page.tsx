import Link from "next/link";
import { Star } from "@/components/icons";
import { formatDate } from "@/components/ui";
import { loadClub } from "@/lib/data";
import { isPlayed } from "@/lib/stats";

export default async function MatchesPage() {
  const { matches, entries, players } = await loadClub();
  const names = new Map(players.map((p) => [p.id, p.name]));
  const counts = new Map<number, number>();
  for (const e of entries) counts.set(e.matchId, (counts.get(e.matchId) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Matches</h1>
        <Link href="/matches/new" className="btn">＋ New match</Link>
      </div>
      {matches.length === 0 ? (
        <p className="card text-sm text-muted">No matches yet. Pick teams to create one.</p>
      ) : (
        <ul className="card divide-y divide-line-soft p-0">
          {matches.map((m) => (
            <li key={m.id}>
              <Link href={`/matches/${m.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                <span className="flex-1 font-medium">{formatDate(m.date)}</span>
                {m.motmId && names.has(m.motmId) && (
                  <span className="hidden items-center gap-1 text-sm text-muted sm:inline-flex"><Star className="text-accent" size={13} /> {names.get(m.motmId)}</span>
                )}
                <span className="text-sm text-muted">{counts.get(m.id) ?? 0} players</span>
                {isPlayed(m) ? (
                  <span className="w-16 text-right font-mono font-bold">{m.scoreA} – {m.scoreB}</span>
                ) : (
                  <span className="w-16 text-right text-xs font-semibold uppercase text-warn">Planned</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
