import Link from "next/link";
import { desc } from "drizzle-orm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/icons";
import { ShareButton } from "@/components/ShareButton";
import { ShareLink } from "@/components/ShareLink";
import { formatDate } from "@/components/ui";
import { db, matches } from "@/db";
import { getActivePlayerNames, getLatestPoll } from "@/lib/data";
import { groupReplies, inviteText, nextGameDate, reminderText } from "@/lib/poll";
import { AdminReplies } from "./AdminReplies";
import { createPoll, deletePoll, setPollOpen } from "./actions";

export default async function AttendancePage() {
  const [poll, players, [lastMatch]] = await Promise.all([
    getLatestPoll(),
    getActivePlayerNames(),
    db.select({ date: matches.date }).from(matches).orderBy(desc(matches.date)).limit(1),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const createForm = (
    <form action={createPoll} className="card space-y-3">
      <div>
        <h2 className="h2">Ask who&apos;s coming</h2>
        <p className="text-sm text-muted">
          Creates a link for the group chat. Players tap their name and say if they&apos;re in. No login needed.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="date">Game day</label>
          <input id="date" name="date" type="date" required className="input" defaultValue={nextGameDate(lastMatch?.date ?? null, today)} />
        </div>
        <button className="btn">Create poll</button>
      </div>
    </form>
  );

  if (!poll) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="h1">Who&apos;s coming</h1>
        {createForm}
      </div>
    );
  }

  const groups = groupReplies(players, poll.replies);
  const answers = new Map(poll.replies.map((r) => [r.playerId, r.answer]));
  const path = `/a/${poll.token}`;
  const n = groups.in.length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="h1">Who&apos;s coming</h1>
        <span className="text-xs text-muted">{poll.open ? "Replies open" : "Replies closed"}</span>
      </div>

      <section className="flex flex-col gap-3 rounded-[20px] bg-accent p-[18px] text-ground">
        <div className="flex items-baseline justify-between text-xs font-semibold">
          <span className="tracking-widest uppercase">{formatDate(poll.date)}</span>
          <span>
            {groups.maybe.length} maybe · {groups.out.length} out · {groups.none.length} no reply
          </span>
        </div>
        <div className="font-display text-[44px] leading-[0.95] font-extrabold uppercase">
          {n} in{n >= 2 && <span className="text-2xl"> · {Math.floor(n / 2)} v {Math.ceil(n / 2)}</span>}
        </div>
        {poll.open ? (
          <Link
            href="/matches/new"
            className="flex min-h-12 items-center justify-between rounded-[14px] bg-ground px-[18px] text-[15px] font-semibold text-fg"
          >
            Pick teams from the {n} in
            <Icon name="arrowRight" size={20} />
          </Link>
        ) : (
          poll.matchId && (
            <Link
              href={`/matches/${poll.matchId}`}
              className="flex min-h-12 items-center justify-between rounded-[14px] bg-ground px-[18px] text-[15px] font-semibold text-fg"
            >
              Teams picked · open match
              <Icon name="arrowRight" size={20} />
            </Link>
          )
        )}
      </section>

      {poll.open && (
        <section className="card space-y-3">
          <div>
            <h2 className="h2">Share in the group chat</h2>
            <p className="text-sm text-muted">On your phone, Share opens the share sheet: pick Messenger, then the team chat.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareButton what="invite" path={path} template={inviteText(poll.date, "{url}")} className="btn flex-1" />
            {groups.none.length > 0 && (
              <ShareButton
                what="reminder"
                path={path}
                template={reminderText(poll.date, "{url}", groups)}
                className="btn-secondary flex-1"
              />
            )}
          </div>
          <ShareLink path={path} />
        </section>
      )}

      <section className="card space-y-2">
        <div>
          <h2 className="h2">Replies</h2>
          <p className="text-sm text-muted">Someone answered in the chat instead? Set it here.</p>
        </div>
        <AdminReplies pollId={poll.id} players={players.map((p) => ({ ...p, answer: answers.get(p.id) ?? null }))} />
      </section>

      <form className="flex flex-wrap gap-2">
        <button className="btn-secondary" formAction={setPollOpen.bind(null, poll.id, !poll.open)}>
          {poll.open ? "Close replies" : "Reopen replies"}
        </button>
        <ConfirmButton message="Delete this poll and all its replies?" formAction={deletePoll.bind(null, poll.id)}>
          Delete poll
        </ConfirmButton>
      </form>

      {!poll.open && createForm}
    </div>
  );
}
