import Link from "next/link";
import { Form, PosBadge } from "@/components/ui";
import { loadClub, type PlayerRow } from "@/lib/data";

const COLUMNS = [
  { key: "played", label: "P", get: (p: PlayerRow) => p.stats.played },
  { key: "wins", label: "W", get: (p: PlayerRow) => p.stats.wins },
  { key: "draws", label: "D", get: (p: PlayerRow) => p.stats.draws },
  { key: "losses", label: "L", get: (p: PlayerRow) => p.stats.losses },
  { key: "winPct", label: "Win %", get: (p: PlayerRow) => p.stats.winPct },
  { key: "goals", label: "Goals", get: (p: PlayerRow) => p.stats.goals },
  { key: "assists", label: "Ast", get: (p: PlayerRow) => p.stats.assists },
  { key: "elo", label: "Elo", get: (p: PlayerRow) => p.stats.elo },
  { key: "strength", label: "Str", get: (p: PlayerRow) => p.strength },
] as const;
type SortKey = (typeof COLUMNS)[number]["key"];

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const sp = await searchParams;
  const sort = (COLUMNS.some((c) => c.key === sp.sort) ? sp.sort : "winPct") as SortKey;
  const min = Math.max(0, Number(sp.min ?? 1) || 0);
  const col = COLUMNS.find((c) => c.key === sort)!;

  const { players } = await loadClub();
  const rows = players
    .filter((p) => p.stats.played >= min)
    .sort((a, b) => col.get(b) - col.get(a) || b.stats.played - a.stats.played);

  const href = (s: string, m = min) => `/stats?sort=${s}&min=${m}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Stats</h1>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-neutral-500">Min games:</span>
          {[1, 3, 5, 10].map((m) => (
            <Link key={m} href={href(sort, m)} className={`rounded px-2 py-1 ${m === min ? "bg-pitch-700 text-white" : "hover:bg-black/5"}`}>
              {m}+
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="card text-sm text-neutral-600">No stats yet — enter some match results.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Player</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right">
                    <Link href={href(c.key)} className={c.key === sort ? "text-pitch-700 underline" : "hover:text-neutral-800"}>
                      {c.label}
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-2 text-left">Form</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <span className="inline-flex items-center gap-2">
                      <PosBadge position={p.position} />
                      <Link href={`/players/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    </span>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={`px-2 py-2 text-right tabular-nums ${c.key === sort ? "font-bold" : ""}`}>
                      {c.key === "winPct" ? `${c.get(p)}%` : c.key === "strength" ? c.get(p).toFixed(1) : c.get(p)}
                    </td>
                  ))}
                  <td className="px-3 py-2"><Form form={p.stats.form} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-500">
        Win % = wins ÷ games played (draws count as not-won). Elo starts at 1000 and moves with every result, weighted by how strong
        each team was. Goals/assists only count matches where you entered them.
      </p>
    </div>
  );
}
