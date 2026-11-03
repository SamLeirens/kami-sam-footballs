"use client";

import { useOptimistic, useTransition } from "react";
import { ANSWERS, ANSWER_LABEL, type Answer } from "@/lib/poll";
import { setReply } from "./actions";

type P = { id: number; name: string; answer: Answer | null };

const ON: Record<Answer, string> = {
  in: "bg-accent text-ground",
  maybe: "bg-warn-dim text-warn",
  out: "bg-danger-dim text-danger",
};

/** Every active player with In / Maybe / Out toggles. Tap the selected one again to clear it. */
export function AdminReplies({ pollId, players }: { pollId: number; players: P[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    players,
    (list, { id, answer }: { id: number; answer: Answer | null }) => list.map((p) => (p.id === id ? { ...p, answer } : p)),
  );

  function set(id: number, answer: Answer | null) {
    startTransition(async () => {
      setOptimistic({ id, answer });
      await setReply(pollId, id, answer);
    });
  }

  return (
    <ul className="divide-y divide-line-soft">
      {optimistic.map((p) => (
        <li key={p.id} className="flex items-center gap-2 py-1.5">
          <span className={`flex-1 truncate text-sm ${p.answer ? "font-medium" : "text-muted"}`}>{p.name}</span>
          <div role="group" aria-label={`${p.name}'s answer`} className="flex gap-1">
            {ANSWERS.map((a) => {
              const on = p.answer === a;
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set(p.id, on ? null : a)}
                  className={`min-h-10 w-[4.25rem] rounded-lg text-xs font-semibold transition ${
                    on ? ON[a] : "border border-line bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {ANSWER_LABEL[a].short}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
