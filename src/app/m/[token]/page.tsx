import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { formatDate } from "@/components/ui";
import { loadClub } from "@/lib/data";
import { tally } from "@/lib/motm";
import { isPlayed } from "@/lib/stats";
import { voteCookie } from "./vote-cookie";
import { VoteForm } from "./VoteForm";

async function load(token: string) {
  const club = await loadClub();
  const match = club.matches.find((m) => m.shareToken === token);
  if (!match) return null;
  return { club, match };
}

export async function generateMetadata({ params }: PageProps<"/m/[token]">): Promise<Metadata> {
  const data = await load((await params).token);
  if (!data) return { title: "Kami Football" };
  const { match } = data;
  const title = isPlayed(match)
    ? `Team A ${match.scoreA}–${match.scoreB} Team B · ${formatDate(match.date)}`
    : `Teams for ${formatDate(match.date)}`;
  return { title, description: isPlayed(match) ? "Result, stats and man of the match vote" : "Kami Football line-ups" };
}

export default async function SharedMatchPage({ params }: PageProps<"/m/[token]">) {
  const { token } = await params;
  const data = await load(token);
  if (!data) notFound();
  const { club, match } = data;

  // Only names and match numbers are shown here — never ratings.
  const names = new Map(club.players.map((p) => [p.id, p.name]));
  const lineup = club.entries
    .filter((e) => e.matchId === match.id && names.has(e.playerId))
    .map((e) => ({ ...e, name: names.get(e.playerId)! }))
    .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0) || a.name.localeCompare(b.name));
  const teams = { A: lineup.filter((e) => e.team === "A"), B: lineup.filter((e) => e.team === "B") };

  const votes = club.votes.filter((v) => v.matchId === match.id);
  const voted = new Set(votes.map((v) => v.voterId));
  const t = tally(votes);
  const played = isPlayed(match);
  const votingLive = played && match.votingOpen && match.motmPlayerId === null;
  const myVoterId = Number((await cookies()).get(voteCookie(match.id))?.value) || null;
  const myVote = myVoterId ? votes.find((v) => v.voterId === myVoterId) : undefined;

  const winner = played ? (match.scoreA! > match.scoreB! ? "A" : match.scoreB! > match.scoreA! ? "B" : null) : null;
  const scorers = lineup.filter((e) => (e.goals ?? 0) > 0);
  const assisters = [...lineup].filter((e) => (e.assists ?? 0) > 0).sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0));

  // Club leaders for a bit of context
  const qualified = club.players.filter((p) => p.stats.played >= 3);
  const leaders = [
    { title: "Win %", rows: [...qualified].sort((a, b) => b.stats.winPct - a.stats.winPct).slice(0, 3).map((p) => [p.name, `${p.stats.winPct}%`]) },
    { title: "Goals", rows: club.players.filter((p) => p.stats.goals).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 3).map((p) => [p.name, p.stats.goals]) },
    { title: "⭐ MOTM", rows: club.players.filter((p) => p.stats.motm).sort((a, b) => b.stats.motm - a.stats.motm).slice(0, 3).map((p) => [p.name, `${p.stats.motm}×`]) },
  ].filter((l) => l.rows.length);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
      <div className="text-center text-sm font-semibold text-pitch-800">⚽ Kami Football · {formatDate(match.date)}</div>

      {/* Scoreboard */}
      <section className="overflow-hidden rounded-2xl bg-pitch-800 text-white shadow">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6 text-center">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-white/70">Team A</div>
            {winner === "A" && <div className="text-xs">🏆</div>}
          </div>
          <div className="font-mono text-5xl font-bold tabular-nums">
            {played ? `${match.scoreA}–${match.scoreB}` : "vs"}
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-white/70">Team B</div>
            {winner === "B" && <div className="text-xs">🏆</div>}
          </div>
        </div>
        {played && (scorers.length > 0 || match.motmId) && (
          <div className="space-y-1 bg-black/15 px-4 py-3 text-center text-sm">
            {scorers.length > 0 && (
              <div>⚽ {scorers.map((e) => `${e.name}${(e.goals ?? 0) > 1 ? ` ×${e.goals}` : ""}`).join(", ")}</div>
            )}
            {match.motmId && names.has(match.motmId) && !votingLive && (
              <div className="font-semibold">⭐ Man of the match: {names.get(match.motmId)}</div>
            )}
          </div>
        )}
        {match.notes && <div className="px-4 pb-3 text-center text-sm text-white/80">{match.notes}</div>}
      </section>

      {/* MOTM vote */}
      {played && (votingLive || votes.length > 0) && (
        <section className="card space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="h2">⭐ Man of the match</h2>
            <span className="text-xs text-neutral-500">
              {votingLive ? `voting open · ${votes.length}/${lineup.length} voted` : "voting closed"}
            </span>
          </div>

          {votingLive &&
            (myVote ? (
              <p className="rounded-lg bg-pitch-50 px-3 py-2 text-sm">
                Thanks {names.get(myVote.voterId)} — you voted for <b>{names.get(myVote.candidateId)}</b>.
              </p>
            ) : (
              <VoteForm token={token} players={lineup.map((e) => ({ id: e.playerId, name: e.name, team: e.team, voted: voted.has(e.playerId) }))} />
            ))}

          {t.ranked.length > 0 && (
            <ul className="space-y-1.5">
              {t.ranked.map(([id, n]) => (
                <li key={id} className="text-sm">
                  <div className="mb-0.5 flex justify-between">
                    <span className={id === match.motmId ? "font-semibold" : ""}>{id === match.motmId && "⭐ "}{names.get(id)}</span>
                    <span className="tabular-nums text-neutral-500">{n} vote{n === 1 ? "" : "s"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(n / t.ranked[0][1]) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {votes.length > 0 && (
            <p className="text-xs text-neutral-500">
              Voted: {votes.map((v) => names.get(v.voterId)).join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Line-ups */}
      <div className="grid grid-cols-2 gap-3">
        {(["A", "B"] as const).map((team) => (
          <section key={team} className={`card border-t-4 p-3 ${team === "A" ? "border-t-pitch-600" : "border-t-sky-600"}`}>
            <h2 className="mb-2 font-semibold">
              Team {team} <span className="text-xs font-normal text-neutral-500">({teams[team].length})</span>
            </h2>
            <ul className="space-y-1 text-sm">
              {teams[team].map((e) => (
                <li key={e.playerId} className="flex items-center gap-1">
                  <span className="flex-1 truncate">
                    {e.name}
                    {e.playerId === match.motmId && !votingLive && " ⭐"}
                  </span>
                  {(e.goals ?? 0) > 0 && <span className="text-xs">⚽{(e.goals ?? 0) > 1 ? e.goals : ""}</span>}
                  {(e.assists ?? 0) > 0 && <span className="text-xs text-neutral-500">🅰️{(e.assists ?? 0) > 1 ? e.assists : ""}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {assisters.length > 0 && (
        <p className="text-center text-xs text-neutral-500">
          Assists: {assisters.map((e) => `${e.name}${(e.assists ?? 0) > 1 ? ` ×${e.assists}` : ""}`).join(", ")}
        </p>
      )}

      {played && leaders.length > 0 && (
        <section className="card">
          <h2 className="h2 mb-3">Club leaders</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {leaders.map((l) => (
              <div key={l.title}>
                <div className="label">{l.title}</div>
                <ol className="space-y-0.5">
                  {l.rows.map(([name, v]) => (
                    <li key={String(name)} className="flex justify-between gap-1">
                      <span className="truncate">{name}</span>
                      <b className="tabular-nums">{v}</b>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
