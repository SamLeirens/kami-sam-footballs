import Link from "next/link";
import { PlayerForm } from "@/components/PlayerForm";
import { Form, PosBadge } from "@/components/ui";
import { loadClub } from "@/lib/data";
import { createPlayer } from "./actions";

export default async function PlayersPage() {
  const { players } = await loadClub();
  const active = players.filter((p) => p.active);
  const inactive = players.filter((p) => !p.active);

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

      {players.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-line-soft text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-2 py-2">Pos</th>
                <th className="px-2 py-2 text-right" title="Your rating">Rating</th>
                <th className="px-2 py-2 text-right" title="Rating adjusted by results — used for teams">Strength</th>
                <th className="px-2 py-2 text-right">P</th>
                <th className="px-2 py-2 text-right">Win %</th>
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
    </div>
  );
}
