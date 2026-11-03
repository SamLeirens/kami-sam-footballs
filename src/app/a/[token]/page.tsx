import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PollLists } from "@/components/PollLists";
import { formatDate } from "@/components/ui";
import { getActivePlayerNames, getPollByToken } from "@/lib/data";
import { groupReplies } from "@/lib/poll";
import { ME_COOKIE } from "./me-cookie";
import { ReplyForm } from "./ReplyForm";

export async function generateMetadata({ params }: PageProps<"/a/[token]">): Promise<Metadata> {
  const poll = await getPollByToken((await params).token);
  if (!poll) return { title: "Kami FC" };
  const title = `Who's coming? · ${formatDate(poll.date, { short: true })}`;
  const description = "Kami FC · tap to say if you're in";
  // Shown as the link preview in the group chat.
  return { title, description, openGraph: { title, description, siteName: "Kami FC" } };
}

export default async function PollPage({ params }: PageProps<"/a/[token]">) {
  const { token } = await params;
  const [poll, players] = await Promise.all([getPollByToken(token), getActivePlayerNames()]);
  if (!poll) notFound();

  // Only names and answers are shown here, never ratings.
  const groups = groupReplies(players, poll.replies);
  const answers = new Map(poll.replies.map((r) => [r.playerId, r.answer]));
  const me = Number((await cookies()).get(ME_COOKIE)?.value) || null;
  const n = groups.in.length;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl leading-none font-extrabold tracking-wider">KAMI FC</span>
        <span className="text-xs text-muted">{poll.open ? "Replies open" : "Replies closed"}</span>
      </div>

      <section className="flex flex-col gap-2 rounded-[20px] bg-accent p-[18px] text-ground">
        <div className="flex items-baseline justify-between text-xs font-semibold">
          <span className="tracking-widest uppercase">Who&apos;s coming?</span>
          <span>
            {n} in{n >= 2 && ` · ${Math.floor(n / 2)} v ${Math.ceil(n / 2)}`}
            {groups.maybe.length > 0 && ` · ${groups.maybe.length} maybe`}
          </span>
        </div>
        <h1 className="font-display text-[44px] leading-[0.95] font-extrabold uppercase">{formatDate(poll.date, { short: true })}</h1>
      </section>

      <section className="card">
        {poll.open ? (
          <ReplyForm token={token} players={players.map((p) => ({ ...p, answer: answers.get(p.id) ?? null }))} me={me} />
        ) : (
          <p className="text-center text-sm text-muted">
            Replies are closed{poll.matchId ? ": the teams have been picked." : "."} Ask the admin if your plans changed.
          </p>
        )}
      </section>

      <section className="card">
        <PollLists groups={groups} me={me} />
      </section>
    </main>
  );
}
