import Link from "next/link";
import { CopyTeamsButton } from "@/components/CopyTeamsButton";
import { TEAMS } from "@/lib/teams";
import { Star } from "@/components/icons";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShareButton } from "@/components/ShareButton";
import { ShareLink } from "@/components/ShareLink";
import { Icon } from "@/components/icons";
import { tally } from "@/lib/motm";
import { formatDate, PosBadge } from "@/components/ui";
import { loadClub, type PlayerRow } from "@/lib/data";
import { inviteText, reminderText, RSVP_STATUSES, type RsvpStatus } from "@/lib/rsvp";

type Club = Awaited<ReturnType<typeof loadClub>>;
import { isPlayed } from "@/lib/stats";
import {
  addToMatch,
  createShareLink,
  deleteMatch,
  removeFromMatch,
  removeVote,
  saveResult,
  setVotingOpen,
  setRsvp,
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

  if (!played && lineup.length === 0) return <PlannedMatch club={club} match={match} />;

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
        {!played && (
          <Link href={`/matches/new?match=${id}`} className="ml-auto text-sm font-semibold text-accent">
            Re-pick teams
          </Link>
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

/** A match with a date but no teams yet: collect who's in, then pick teams. */
function PlannedMatch({ club, match }: { club: Club; match: Club["matches"][number] }) {
  const replies = new Map(club.rsvps.filter((r) => r.matchId === match.id).map((r) => [r.playerId, r.status]));
  const people = club.players
    .filter((p) => p.active && (!p.isGuest || replies.has(p.id)))
    .map((p) => ({ ...p, status: replies.get(p.id) ?? null }))
    .sort((a, b) => order(a.status) - order(b.status) || a.name.localeCompare(b.name));
  const inCount = people.filter((p) => p.status === "in").length;
  const outCount = people.filter((p) => p.status === "out").length;
  const maybeCount = people.filter((p) => p.status === "maybe").length;
  const waiting = people.filter((p) => p.status === null).map((p) => p.name);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/matches" className="text-sm text-muted hover:underline">← Matches</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="h1">{formatDate(match.date)}</h1>
        <span className="rounded-full bg-warn-dim px-2.5 py-1 text-xs font-semibold text-warn">Planned</span>
      </div>

      <section className="flex flex-col gap-3 rounded-[20px] bg-accent p-[18px] text-ground">
        <div className="flex items-baseline justify-between text-xs font-semibold">
          <span className="tracking-widest uppercase">Who&apos;s in</span>
          <span>
            {maybeCount} maybe · {outCount} out · {waiting.length} no reply
          </span>
        </div>
        <div className="font-display text-[44px] leading-[0.95] font-extrabold uppercase">
          {inCount} in{inCount >= 2 && <span className="text-2xl"> · {Math.floor(inCount / 2)} v {Math.ceil(inCount / 2)}</span>}
        </div>
        <Link
          href={`/matches/new?match=${match.id}`}
          className="flex min-h-12 items-center justify-between rounded-[14px] bg-ground px-[18px] text-[15px] font-semibold text-fg"
        >
          Pick teams from {inCount} players
          <Icon name="arrowRight" size={20} />
        </Link>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="h2">Ask the group</h2>
          <p className="text-sm text-muted">
            Players open the link, pick their name and tap in, maybe or out. No login needed. On your phone, Share opens the
            share sheet: pick Messenger, then the team chat.
          </p>
        </div>
        {match.shareToken ? (
          <>
            <div className="flex flex-wrap gap-2">
              <ShareButton what="invite" path={`/m/${match.shareToken}`} template={inviteText(match.date, "{url}")} className="btn flex-1" />
              {waiting.length > 0 && (
                <ShareButton
                  what="reminder"
                  path={`/m/${match.shareToken}`}
                  template={reminderText(match.date, "{url}", inCount, waiting)}
                  className="btn-secondary flex-1"
                />
              )}
            </div>
            <ShareLink path={`/m/${match.shareToken}`} />
          </>
        ) : (
          <form action={createShareLink.bind(null, match.id)}>
            <button className="btn">Create link</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="h2">Replies</h2>
          <span className="text-xs text-muted">Set someone&apos;s reply yourself if they told you</span>
        </div>
        <ul className="divide-y divide-line-soft">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
              <PosBadge position={p.position} />
              <span className="flex-1 truncate font-medium">
                {p.name}
                {p.isGuest && <span className="ml-1.5 text-xs text-muted">guest</span>}
              </span>
              <form className="flex gap-1">
                {RSVP_STATUSES.map((st) => (
                  <RsvpButton key={st} on={p.status === st} tone={st} action={setRsvp.bind(null, match.id, p.id, p.status === st ? null : st)} />
                ))}
              </form>
            </li>
          ))}
        </ul>
      </section>

      <form>
        <ConfirmButton message="Delete this planned match?" formAction={deleteMatch.bind(null, match.id)}>
          Delete match
        </ConfirmButton>
      </form>
    </div>
  );
}

const order = (s: RsvpStatus | null) => (s === "in" ? 0 : s === "maybe" ? 1 : s === null ? 2 : 3);

const RSVP_ON: Record<RsvpStatus, string> = {
  in: "bg-accent text-ground border-accent",
  maybe: "bg-warn-dim text-warn border-warn/60",
  out: "bg-danger-dim text-danger border-danger/60",
};
const RSVP_LABEL: Record<RsvpStatus, string> = { in: "In", maybe: "Maybe", out: "Out" };

function RsvpButton({ on, tone, action }: { on: boolean; tone: RsvpStatus; action: () => Promise<void> }) {
  const onStyle = RSVP_ON[tone];
  const label = RSVP_LABEL[tone];
  return (
    <button
      formAction={action}
      aria-pressed={on}
      className={`min-h-9 min-w-12 rounded-lg border px-2.5 text-xs font-semibold ${on ? onStyle : "border-line text-muted hover:text-fg"}`}
    >
      {label}
    </button>
  );
}
