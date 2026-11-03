import Link from "next/link";
import { TEAMS } from "@/lib/teams";
import { Icon, Star } from "@/components/icons";
import { LeaderTabs, type LeaderBoard } from "@/components/LeaderTabs";
import { ShareButton } from "@/components/ShareButton";
import { formatDate } from "@/components/ui";
import { getOpenPoll, loadClub, type PlayerRow } from "@/lib/data";
import { groupReplies, inviteText, reminderText } from "@/lib/poll";
import { isPlayed } from "@/lib/stats";

const MIN_GAMES = 3;

export default async function Dashboard() {
  const [{ players, matches, entries }, poll] = await Promise.all([loadClub(), getOpenPoll()]);
  const names = new Map(players.map((p) => [p.id, p.name]));
  const playedMatches = matches.filter(isPlayed);
  const next = matches.filter((m) => !isPlayed(m)).at(-1); // newest first → earliest planned
  const last = playedMatches[0];
  const lineup = (id: number) => entries.filter((e) => e.matchId === id);

  if (players.length === 0) {
    return (
      <section className="mx-auto max-w-md space-y-4 rounded-3xl bg-accent p-6 text-ground">
        <h1 className="font-display text-5xl leading-[0.9] font-extrabold uppercase">Welcome</h1>
        <p className="text-sm font-medium">Start by adding your players and rating them. Then pick your first fair teams.</p>
        <Link href="/players" className="flex min-h-12 items-center justify-between rounded-xl bg-ground px-5 font-semibold text-fg">
          Add players <Icon name="arrowRight" size={20} />
        </Link>
      </section>
    );
  }

  const board = (rows: PlayerRow[], value: (p: PlayerRow) => string) =>
    rows.slice(0, 5).map((p) => ({ id: p.id, name: p.name, value: value(p), form: p.stats.form }));
  const boards: LeaderBoard[] = [
    {
      key: "win",
      label: "Win %",
      empty: `Players need ${MIN_GAMES}+ games to appear here.`,
      rows: board(
        players.filter((p) => p.stats.played >= MIN_GAMES).sort((a, b) => b.stats.winPct - a.stats.winPct || b.stats.played - a.stats.played),
        (p) => `${Math.round(p.stats.winPct)}%`,
      ),
    },
    {
      key: "goals",
      label: "Goals",
      empty: "No goals recorded yet.",
      rows: board(players.filter((p) => p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals), (p) => String(p.stats.goals)),
    },
    {
      key: "motm",
      label: "MOTM",
      empty: "No man of the match awards yet.",
      rows: board(players.filter((p) => p.stats.motm > 0).sort((a, b) => b.stats.motm - a.stats.motm), (p) => `${p.stats.motm}×`),
    },
  ];

  const nextCount = next ? lineup(next.id).length : 0;
  const pollGroups = poll ? groupReplies(players.filter((p) => p.active), poll.replies) : null;
  const cardLink = "flex min-h-12 items-center justify-between rounded-[14px] bg-ground px-[18px] text-[15px] font-semibold text-fg";
  const lastLineup = last ? lineup(last.id) : [];
  const scorers = lastLineup.filter((e) => (e.goals ?? 0) > 0).sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
  const winner = last ? (last.scoreA > last.scoreB ? "A" : last.scoreB > last.scoreA ? "B" : null) : null;

  return (
    <div className="mx-auto max-w-xl space-y-3.5 md:max-w-none md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
      {poll && pollGroups ? (
        // A "who's coming?" poll is collecting replies: that's the next step.
        <section className="flex flex-col gap-3 rounded-[20px] bg-accent p-[18px] text-ground">
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="tracking-widest uppercase">Who&apos;s coming</span>
            <span>
              {pollGroups.in.length} in · {pollGroups.maybe.length} maybe · {pollGroups.none.length} no reply
            </span>
          </div>
          <div className="font-display text-[44px] leading-[0.95] font-extrabold uppercase">{formatDate(poll.date, { short: true })}</div>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton
              what={pollGroups.none.length && poll.replies.length ? "reminder" : "invite"}
              path={`/a/${poll.token}`}
              template={
                pollGroups.none.length && poll.replies.length ? reminderText(poll.date, "{url}", pollGroups) : inviteText(poll.date, "{url}")
              }
              className="min-h-12 rounded-[14px] border border-ground/25 px-3 text-[15px] font-semibold"
            />
            <Link href="/attendance" className={cardLink}>
              Replies
              <Icon name="arrowRight" size={20} />
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-[20px] bg-accent p-[18px] text-ground">
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="tracking-widest uppercase">{next ? "Next match" : "No match planned"}</span>
            {next && (
              <span>
                {nextCount} in · {Math.floor(nextCount / 2)} v {Math.ceil(nextCount / 2)}
              </span>
            )}
          </div>
          <div className="font-display text-[44px] leading-[0.95] font-extrabold uppercase">
            {next ? formatDate(next.date, { short: true }) : "Plan next game"}
          </div>
          {next ? (
            <Link href={`/matches/${next.id}`} className={cardLink}>
              Open match
              <Icon name="arrowRight" size={20} />
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/attendance" className={`${cardLink} px-3`}>
                Who&apos;s coming?
              </Link>
              <Link href="/matches/new" className="flex min-h-12 items-center justify-center rounded-[14px] border border-ground/25 px-3 text-[15px] font-semibold">
                Pick teams
              </Link>
            </div>
          )}
        </section>
      )}

      {last ? (
        <section className="card flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold tracking-widest text-muted uppercase">
              Last result · {formatDate(last.date, { short: true })}
            </span>
            <Link href={last.shareToken ? `/m/${last.shareToken}` : `/matches/${last.id}`} className="text-[13px] font-semibold text-accent">
              {last.shareToken ? "Share page" : "Details"}
            </Link>
          </div>
          <Link href={`/matches/${last.id}`} className="grid grid-cols-3 items-center">
            <span className="flex flex-col gap-1">
              <span className="font-display text-xl font-bold text-team-a uppercase">{TEAMS.A.name}</span>
              {winner === "A" && <span className="text-[11px] text-muted">Winner</span>}
            </span>
            <span className="num text-center text-[56px] leading-none font-extrabold">
              {last.scoreA}–{last.scoreB}
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="font-display text-xl font-bold text-team-b uppercase">{TEAMS.B.name}</span>
              {winner === "B" && <span className="text-[11px] text-muted">Winner</span>}
            </span>
          </Link>
          {(scorers.length > 0 || last.motmId) && (
            <div className="flex flex-wrap gap-2 text-[13px]">
              {scorers.map((e) => (
                <span key={e.playerId} className="rounded-full bg-surface-2 px-2.5 py-1.5">
                  {names.get(e.playerId)}
                  {(e.goals ?? 0) > 1 && ` ×${e.goals}`}
                </span>
              ))}
              {last.motmId && names.has(last.motmId) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-2.5 py-1.5 text-accent">
                  <Star /> MOTM {names.get(last.motmId)}
                </span>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="card flex items-center text-sm text-muted">No results yet. Enter a score after your first match.</section>
      )}

      <div className="md:col-span-2">
        <LeaderTabs boards={boards} />
      </div>
    </div>
  );
}
