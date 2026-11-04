import Link from "next/link";
import { PlayerForm } from "@/components/PlayerForm";
import { Form, PosBadge } from "@/components/ui";
import { loadClub, type PlayerRow } from "@/lib/data";
import { createPlayer } from "./actions";

const SORTS = {
  rating: (a: PlayerRow, b: PlayerRow) => b.overall - a.overall || b.strength - a.strength,
  winPct: (a: PlayerRow, b: PlayerRow) =>
    // players with no games sink to the bottom
    Number(b.stats.played > 0) - Number(a.stats.played > 0) ||
    b.stats.winPct - a.stats.winPct ||
    b.stats.played - a.stats.played,
} as const;
type SortKey = keyof typeof SORTS;

export default async function PlayersPage({ searchParams }: PageProps<"/players">) {
  const sp = await searchParams;
  const sort = typeof sp.sort === "string" && sp.sort in SORTS ? (sp.sort as SortKey) : undefined;
  const { players, members } = await loadClub({ season: "all" });
  const ordered = sort ? [...members].sort(SORTS[sort]) : members;
  const active = ordered.filter((p) => p.active);
  const inactive = ordered.filter((p) => !p.active);

  // clicking the active sort header again clears it
  const sortHeader = (key: SortKey, label: string, title?: string) => (
    <th className="px-2 py-2 text-right" title={title}>
      <Link
        href={sort === key ? "/players" : `/players?sort=${key}`}
        scroll={false}
        className={sort === key ? "text-accent underline" : "hover:text-fg"}
      >
        {label}
        {sort === key && " ↓"}
      </Link>
    </th>
  );
  const guests = players.filter((p) => p.isGuest);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Players</h1>
        <span className="text-sm text-muted">{active.length} active</span>
      </div>

      <details className="card group" open={players.length === 0}>
        <summary className="cursor-pointer list-none font-semibold text-accent">
          <span className="group-open:hidden">＋ Add player</span>
          <span className="hidden group-open:inline">Add player</span>
        </summary>
        <div className="mt-4">
          <PlayerForm action={createPlayer} submitLabel="Add player" />
        </div>
      </details>

      {members.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-line-soft text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-2 py-2">Pos</th>
                {sortHeader("rating", "Rating", "Your rating")}
                <th className="px-2 py-2 text-right" title="Rating adjusted by results — used for teams">Strength</th>
                <th className="px-2 py-2 text-right">P</th>
                {sortHeader("winPct", "Win %")}
                <th className="px-4 py-2">Form</th>
              </tr>
            </thead>
            <tbody>
              {[...active, ...inactive].map((p) => (
                <tr key={p.id} className={`border-b border-line-soft last:border-0 ${p.active ? "" : "opacity-45"}`}>
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/players/${p.id}`} className="hover:text-accent hover:underline">
                      {p.name}
                    </Link>
                    {!p.active && <span className="ml-2 text-xs text-muted">inactive</span>}
                  </td>
                  <td className="px-2 py-2"><PosBadge position={p.position} /></td>
                  <td className="px-2 py-2 text-right tabular-nums">{p.overall.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{p.strength.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{p.stats.played}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{p.stats.played ? `${p.stats.winPct}%` : "–"}</td>
                  <td className="px-4 py-2"><Form form={p.stats.form} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {guests.length > 0 && (
        <section className="card">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="h2">Guests</h2>
            <span className="text-xs text-muted">Not in leaderboards or club stats</span>
          </div>
          <ul className="divide-y divide-line-soft text-sm">
            {guests.map((p) => (
              <li key={p.id} className={`flex items-center gap-3 py-2 ${p.active ? "" : "opacity-50"}`}>
                <PosBadge position={p.position} />
                <Link href={`/players/${p.id}`} className="flex-1 font-medium hover:text-accent">{p.name}</Link>
                <span className="text-muted">{p.stats.played} game{p.stats.played === 1 ? "" : "s"}</span>
                <span className="w-10 text-right tabular-nums">{p.overall.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
