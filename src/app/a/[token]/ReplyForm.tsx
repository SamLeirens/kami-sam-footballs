"use client";

import { useActionState, useState } from "react";
import { ANSWERS, ANSWER_LABEL, type Answer } from "@/lib/poll";
import { reply, type ReplyState } from "./actions";

type P = { id: number; name: string; answer: Answer | null };

const ON: Record<Answer, string> = {
  in: "border-accent bg-accent text-ground",
  maybe: "border-warn bg-warn-dim text-warn",
  out: "border-danger bg-danger-dim text-danger",
};

export function ReplyForm({ token, players, me }: { token: string; players: P[]; me: number | null }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(reply.bind(null, token), null);
  const known = me !== null && players.some((p) => p.id === me);
  const [player, setPlayer] = useState(known ? String(me) : "");
  const [picking, setPicking] = useState(!known);
  const current = players.find((p) => String(p.id) === player);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="player" value={player} />
      {picking || !current ? (
        <div>
          <label className="label" htmlFor="player">Who are you?</label>
          <select
            id="player"
            className="input"
            value={player}
            onChange={(e) => {
              setPlayer(e.target.value);
              if (e.target.value) setPicking(false);
            }}
          >
            <option value="">Select your name…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.answer ? ` (${ANSWER_LABEL[p.answer].short.toLowerCase()})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span>
            Replying as <b>{current.name}</b>
          </span>
          <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => setPicking(true)}>
            Not you?
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {ANSWERS.map((a) => {
          const on = current?.answer === a;
          return (
            <button
              key={a}
              name="answer"
              value={a}
              disabled={pending || !current}
              aria-pressed={on}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-semibold transition disabled:opacity-40 ${
                on ? ON[a] : "border-line bg-surface-2 text-fg hover:border-subtle"
              }`}
            >
              <span className="text-xl leading-none" aria-hidden>{ANSWER_LABEL[a].emoji}</span>
              {ANSWER_LABEL[a].button}
            </button>
          );
        })}
      </div>

      {state?.error ? (
        <p className="text-center text-sm text-danger">{state.error}</p>
      ) : (
        <p className="text-center text-xs text-muted">
          {pending ? "Saving…" : state?.saved ? "Saved ✓ You can change it until teams are picked." : "Everyone can see the replies."}
        </p>
      )}
    </form>
  );
}
