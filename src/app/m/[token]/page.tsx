import type { Metadata } from "next";
import { TEAMS } from "@/lib/teams";
import { Star } from "@/components/icons";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { formatDate } from "@/components/ui";
import { loadClub } from "@/lib/data";
import { tally } from "@/lib/motm";
import { isPlayed } from "@/lib/stats";
import { rsvpCookie, voteCookie } from "./vote-cookie";
import { RsvpForm } from "./RsvpForm";
import { VoteForm } from "./VoteForm";

type Club = Awaited<ReturnType<typeof loadClub>>;

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
    ? `${TEAMS.A.name} ${match.scoreA}–${match.scoreB} ${TEAMS.B.name} · ${formatDate(match.date)}`
    : `Are you playing? ${formatDate(match.date)}`;
  return { title, description: isPlayed(match) ? "Result, stats and man of the match vote" : "Kami Football line-ups" };
}

export default async function SharedMatchPage({ params }: PageProps<"/m/[token]">) {
  const { token } = await params;
  const data = await load(token);
  if (!data) notFound();
  const { club, match } = data;
  const hasLineup = club.entries.some((e) => e.matchId === match.id);
  if (!isPlayed(match) && !hasLineup) {
    const me = Number((await cookies()).get(rsvpCookie(match.id))?.value) || null;
    return <Availability token={token} club={club} match={match} me={me} />;
  }

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
  const qualified = club.members.filter((p) => p.stats.played >= 3);
  const leaders = [
    { title: "Win %", rows: [...qualified].sort((a, b) => b.stats.winPct - a.stats.winPct).slice(0, 3).map((p) => [p.name, `${p.stats.winPct}%`]) },
    { title: "Goals", rows: club.members.filter((p) => p.stats.goals).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 3).map((p) => [p.name, p.stats.goals]) },
    { title: "MOTM", rows: club.members.filter((p) => p.stats.motm).sort((a, b) => b.stats.motm - a.stats.motm).slice(0, 3).map((p) => [p.name, `${p.stats.motm}×`]) },
  ].filter((l) => l.rows.length);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl leading-none font-extrabold tracking-wider">KAMI FC</span>
        <span className="text-xs text-muted">{formatDate(match.date)}</span>
      </div>

      {/* Scoreboard */}
      <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
        <div className="grid grid-cols-3 items-center px-4 py-6">
          <div className="flex flex-col gap-1">
            <span className="font-display text-2xl font-bold text-team-a uppercase">{TEAMS.A.name}</span>
            {winner === "A" && <span className="text-[11px] text-muted">Winner</span>}
          </div>
          <div className="num text-center text-6xl leading-none font-extrabold">
            {played ? `${match.scoreA}–${match.scoreB}` : "vs"}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-display text-2xl font-bold text-team-b uppercase">{TEAMS.B.name}</span>
            {winner === "B" && <span className="text-[11px] text-muted">Winner</span>}
          </div>
        </div>
        {played && (scorers.length > 0 || match.motmId) && (
          <div className="flex flex-wrap justify-center gap-2 border-t border-line-soft px-4 py-3 text-[13px]">
            {scorers.map((e) => (
              <span key={e.playerId} className="rounded-full bg-surface-2 px-2.5 py-1.5">
                {e.name}
                {(e.goals ?? 0) > 1 && ` ×${e.goals}`}
              </span>
            ))}
            {match.motmId && names.has(match.motmId) && !votingLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-2.5 py-1.5 font-semibold text-accent">
                <Star /> MOTM {names.get(match.motmId)}
              </span>
            )}
          </div>
        )}
        {match.notes && <div className="border-t border-line-soft px-4 py-3 text-center text-sm text-muted">{match.notes}</div>}
      </section>

      {/* MOTM vote */}
      {played && (votingLive || votes.length > 0) && (
        <section className="card space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="h2">Man of the match</h2>
            <span className="text-xs text-muted">
              {votingLive ? `voting open · ${votes.length}/${lineup.length} voted` : "voting closed"}
            </span>
          </div>

          {votingLive &&
            (myVote ? (
              <p className="rounded-lg bg-accent-dim px-3 py-2 text-sm">
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
                    <span className={id === match.motmId ? "font-semibold" : ""}>{id === match.motmId && <Star className="mr-1 inline text-accent" size={13} />}{names.get(id)}</span>
                    <span className="tabular-nums text-muted">{n} vote{n === 1 ? "" : "s"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(n / t.ranked[0][1]) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {votes.length > 0 && (
            <p className="text-xs text-muted">
              Voted: {votes.map((v) => names.get(v.voterId)).join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Line-ups */}
      <div className="grid grid-cols-2 gap-3">
        {(["A", "B"] as const).map((team) => (
          <section key={team} className={`card border-t-4 p-3 ${TEAMS[team].borderTop}`}>
            <h2 className="mb-2 font-semibold">
              <span className={TEAMS[team].text}>{TEAMS[team].name}</span> <span className="text-xs font-normal text-muted">({teams[team].length})</span>
            </h2>
            <ul className="space-y-1 text-sm">
              {teams[team].map((e) => (
                <li key={e.playerId} className="flex items-center gap-1">
                  <span className="flex-1 truncate">
                    {e.name}
                    {e.playerId === match.motmId && !votingLive && <Star className="ml-1 inline text-accent" size={12} />}
                  </span>
                  {(e.goals ?? 0) > 0 && <span className="text-xs text-soft">{e.goals}G</span>}
                  {(e.assists ?? 0) > 0 && <span className="text-xs text-muted">{e.assists}A</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {assisters.length > 0 && (
        <p className="text-center text-xs text-muted">
          Assists: {assisters.map((e) => `${e.name}${(e.assists ?? 0) > 1 ? ` ×${e.assists}` : ""}`).join(", ")}
        </p>
      )}

      {played && leaders.length > 0 && (
        <section className="card">
          <h2 className="h2 mb-3">Club leaders{club.season ? ` · ${club.season.name}` : ""}</h2>
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

/** Before teams are picked: players say whether they're in. */
function Availability({ token, club, match, me }: { token: string; club: Club; match: Club["matches"][number]; me: number | null }) {
  const replies = new Map(club.rsvps.filter((r) => r.matchId === match.id).map((r) => [r.playerId, r.status]));
  // Active members, plus any guest who already replied
  const people = club.players
    .filter((p) => p.active && (!p.isGuest || replies.has(p.id)))
    .map((p) => ({ id: p.id, name: p.name, status: replies.get(p.id) ?? null }));
  const inList = people.filter((p) => p.status === "in");
  const outList = people.filter((p) => p.status === "out");
  const waiting = people.filter((p) => p.status === null);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
      <div className="font-display text-2xl leading-none font-extrabold tracking-wider">KAMI FC</div>

      <section className="flex flex-col gap-2 rounded-[20px] bg-accent p-[18px] text-ground">
        <span className="text-xs font-semibold tracking-widest uppercase">Are you playing?</span>
        <span className="font-display text-[44px] leading-[0.95] font-extrabold uppercase">{formatDate(match.date, { short: true })}</span>
        <span className="text-sm font-semibold">
          {inList.length} in{inList.length >= 2 ? ` · ${Math.floor(inList.length / 2)} v ${Math.ceil(inList.length / 2)}` : ""}
        </span>
      </section>

      <section className="card">
        <RsvpForm token={token} players={people} me={me} />
      </section>

      <section className="card space-y-3 text-sm">
        <ReplyList title="In" names={inList.map((p) => p.name)} className="text-accent" />
        <ReplyList title="Out" names={outList.map((p) => p.name)} className="text-danger" />
        <ReplyList title="No reply yet" names={waiting.map((p) => p.name)} className="text-muted" />
      </section>
      <p className="text-center text-xs text-muted">Teams get picked once enough people are in. Everyone can see the replies.</p>
    </main>
  );
}

function ReplyList({ title, names, className }: { title: string; names: string[]; className: string }) {
  if (!names.length) return null;
  return (
    <div>
      <div className={`mb-1 text-xs font-semibold tracking-widest uppercase ${className}`}>
        {title} · {names.length}
      </div>
      <p className="text-soft">{names.join(", ")}</p>
    </div>
  );
}
