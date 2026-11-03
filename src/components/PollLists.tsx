import { ANSWER_LABEL, type Answer, type Groups } from "@/lib/poll";

const DOT: Record<Answer | "none", string> = { in: "bg-accent", maybe: "bg-warn", out: "bg-danger", none: "bg-subtle" };
const TITLE: Record<Answer | "none", string> = {
  in: `${ANSWER_LABEL.in.emoji} In`,
  maybe: `${ANSWER_LABEL.maybe.emoji} Maybe`,
  out: `${ANSWER_LABEL.out.emoji} Can't`,
  none: "No reply yet",
};

/** Who's in / maybe / out / hasn't replied, as name chips. */
export function PollLists({ groups, me }: { groups: Groups<{ id: number; name: string }>; me?: number | null }) {
  return (
    <div className="space-y-4">
      {(["in", "maybe", "out", "none"] as const).map((k) =>
        groups[k].length === 0 ? null : (
          <section key={k}>
            <h3 className="label flex items-center gap-1.5">
              {TITLE[k]} <span className="text-subtle">· {groups[k].length}</span>
            </h3>
            <ul className="flex flex-wrap gap-1.5 text-[13px]">
              {groups[k].map((p) => (
                <li
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
                    k === "none" ? "border border-line text-muted" : "bg-surface-2"
                  } ${p.id === me ? "font-semibold" : ""}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${DOT[k]}`} aria-hidden />
                  {p.name}
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
