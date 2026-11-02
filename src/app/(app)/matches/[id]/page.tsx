import Link from "next/link";
import { CopyTeamsButton } from "@/components/CopyTeamsButton";
import { TEAMS } from "@/lib/teams";
import { Star } from "@/components/icons";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShareLink } from "@/components/ShareLink";
import { tally } from "@/lib/motm";
import { formatDate, PosBadge } from "@/components/ui";
import { loadClub, type PlayerRow } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import {
  addToMatch,
  createShareLink,
  deleteMatch,
  removeFromMatch,
  removeVote,
  saveResult,
  setVotingOpen,
  switchTeam,
} from "../actions";

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
  const names = new Map(club.players.map((p) => [p.id, p.name]));
  const votes = club.votes.filter((v) => v.matchId === id);
  const voteTally = tally(votes);

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-muted hover:underline">← Matches</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="h1">{formatDate(match.date)}</h1>
        {played ? (
          <span className="rounded-full bg-accent-dim px-2.5 py-1 text-xs font-semibold text-accent">Played</span>
        ) : (
          <span className="rounded-full bg-warn-dim px-2.5 py-1 text-xs font-semibold text-warn">Planned</span>
        )}
      </div>

      <form action={saveResult.bind(null, id)} className="space-y-4">
        <section className="card">
          <h2 className="h2 mb-3">Result</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <div>
                <label className="label text-team-a" htmlFor="scoreA">{TEAMS.A.name}</label>
                <input id="scoreA" name="scoreA" type="number" min={0} inputMode="numeric" defaultValue={match.scoreA ?? ""} className="input w-20 text-center text-xl font-bold" />
              </div>
              <span className="mt-5 text-xl font-bold text-muted">–</span>
              <div>
                <label className="label text-team-b" htmlFor="scoreB">{TEAMS.B.name}</label>
                <input id="scoreB" name="scoreB" type="number" min={0} inputMode="numeric" defaultValue={match.scoreB ?? ""} className="input w-20 text-center text-xl font-bold" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" name="date" type="date" defaultValue={match.date} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="motm">Man of the match</label>
              <select key={match.motmPlayerId ?? "none"} id="motm" name="motm" defaultValue={match.motmPlayerId ?? ""} className="input">
                <option value="">
                  {voteTally.leader ? `Players' vote (${names.get(voteTally.leader)})` : "Players' vote"}
                </option>
                {(["A", "B"] as const).map((t) => (
                  <optgroup key={t} label={TEAMS[t].name}>
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
          <p className="mt-2 text-xs text-muted">
            Goals and assists below are optional — leave blank if you don&apos;t know.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((t) => (
            <section key={t} className={`card border-t-4 ${TEAMS[t].borderTop}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className={`h2 ${TEAMS[t].text}`}>{TEAMS[t].name} <span className="text-sm font-normal text-muted">({teams[t].length})</span></h2>
                <span className="text-sm text-muted">strength {total(teams[t]).toFixed(1)}</span>
              </div>
              <div className="mb-1 grid grid-cols-[auto_1fr_3rem_3rem_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                <span className="w-9" /><span /><span className="text-center">Goals</span><span className="text-center">Ast</span><span className="w-16" />
              </div>
              <ul className="space-y-1">
                {teams[t].map((e) => (
                  <LineupRow key={e.playerId} matchId={id} player={e.player} team={t} goals={e.goals} assists={e.assists} motm={match.motmId === e.playerId} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn">Save result</button>
          <CopyTeamsButton date={match.date} blue={teams.A.map((e) => e.player.name)} orange={teams.B.map((e) => e.player.name)} />
          <ConfirmButton message="Delete this match?" formAction={deleteMatch.bind(null, id)}>
            Delete match
          </ConfirmButton>
        </div>
      </form>

      <section className="card space-y-3">
        <div>
          <h2 className="h2">Share with the team</h2>
          <p className="text-sm text-muted">
            A public page with the result, scorers and club leaders{played ? ", where players vote for man of the match" : ""}. No ratings are shown.
          </p>
        </div>
        {match.shareToken ? (
          <ShareLink path={`/m/${match.shareToken}`} />
        ) : (
          <form action={createShareLink.bind(null, id)}>
            <button className="btn">Create share link</button>
          </form>
        )}

        {match.shareToken && played && (
          <div className="space-y-2 border-t border-line-soft pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                MOTM vote{" "}
                <span className="text-sm font-normal text-muted">
                  {votes.length}/{lineup.length} voted ·{" "}
                  {match.motmPlayerId !== null ? "closed (you picked MOTM above)" : match.votingOpen ? "open" : "closed"}
                </span>
              </h3>
              {match.motmPlayerId === null && (
                <form action={setVotingOpen.bind(null, id, !match.votingOpen)}>
                  <button className="btn-secondary">{match.votingOpen ? "Close voting" : "Reopen voting"}</button>
                </form>
              )}
            </div>
            {voteTally.ranked.length > 0 && (
              <p className="text-sm">
                {voteTally.ranked.map(([pid, n]) => `${names.get(pid)} ${n}`).join(" · ")}
                {!voteTally.leader && <span className="text-warn"> (tie: pick MOTM above to settle it)</span>}
              </p>
            )}
            {votes.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {votes.map((v) => (
                  <li key={v.voterId} className="flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-2.5 pr-1">
                    {names.get(v.voterId)} → {names.get(v.candidateId)}
                    <form action={removeVote.bind(null, id, v.voterId)}>
                      <button className="rounded-full px-1.5 text-muted hover:bg-danger-dim hover:text-danger" title="Remove this vote">✕</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

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
            <option value="A">{TEAMS.A.name}</option>
            <option value="B">{TEAMS.B.name}</option>
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
        {motm && <Star className="ml-1 inline text-accent" size={13} />}
      </Link>
      <input name={`goals_${player.id}`} type="number" min={0} inputMode="numeric" defaultValue={goals ?? ""} className="input px-1 py-1 text-center" aria-label={`${player.name} goals`} />
      <input name={`assists_${player.id}`} type="number" min={0} inputMode="numeric" defaultValue={assists ?? ""} className="input px-1 py-1 text-center" aria-label={`${player.name} assists`} />
      <span className="flex w-16 justify-end">
        <button formAction={switchTeam.bind(null, matchId, player.id)} className="rounded px-2 py-1 text-muted hover:bg-surface-2" title={`Move to ${TEAMS[team === "A" ? "B" : "A"].name}`}>⇄</button>
        <button formAction={removeFromMatch.bind(null, matchId, player.id)} className="rounded px-2 py-1 text-muted hover:bg-danger-dim hover:text-danger" title="Remove from match">✕</button>
      </span>
    </li>
  );
}
