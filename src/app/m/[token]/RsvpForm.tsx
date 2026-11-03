"use client";

import { startTransition, useActionState, useState } from "react";
import { RSVP_STATUSES, type RsvpStatus } from "@/lib/rsvp";
import { respond, type RsvpState } from "./actions";

type P = { id: number; name: string; status: RsvpStatus | null };

const LABEL: Record<RsvpStatus, string> = { in: "I'm in", maybe: "Maybe", out: "Can't" };
const STYLE: Record<RsvpStatus, { on: string; off: string }> = {
  in: { on: "border-accent bg-accent font-bold text-ground ring-2 ring-accent ring-offset-2 ring-offset-surface", off: "border-accent bg-accent font-bold text-ground" },
  maybe: { on: "border-warn bg-warn-dim text-warn", off: "border-line bg-surface-2 text-fg" },
  out: { on: "border-danger bg-danger-dim text-danger", off: "border-line bg-surface-2 text-fg" },
};
const TEXT: Record<RsvpStatus, string> = { in: "text-accent", maybe: "text-warn", out: "text-danger" };

export function RsvpForm({ token, players, me }: { token: string; players: P[]; me: number | null }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(respond.bind(null, token), null);
  const [player, setPlayer] = useState(me && players.some((p) => p.id === me) ? String(me) : "");
  const current = players.find((p) => String(p.id) === player)?.status ?? null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        // Submit without React's automatic form reset, which would blank the selected name.
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(fd));
      }}
    >
      <div>
        <label className="label" htmlFor="player">Who are you?</label>
        <select id="player" name="player" className="input" value={player} onChange={(e) => setPlayer(e.target.value)}>
          <option value="">Select your name…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.status ? ` (${p.status})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {RSVP_STATUSES.map((st) => (
          <button
            key={st}
            name="status"
            value={st}
            disabled={pending || !player}
            aria-pressed={current === st}
            className={`min-h-[52px] rounded-xl border text-[15px] font-semibold disabled:opacity-40 ${STYLE[st][current === st ? "on" : "off"]}`}
          >
            {LABEL[st]}
          </button>
        ))}
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {current && !pending && (
        <p className="text-center text-sm text-muted">
          You&apos;re marked <b className={TEXT[current]}>{current}</b>. Tap another button to change.
        </p>
      )}
    </form>
  );
}
