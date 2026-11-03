"use client";

import { startTransition, useActionState, useState } from "react";
import { respond, type RsvpState } from "./actions";

type P = { id: number; name: string; status: "in" | "out" | null };

export function RsvpForm({ token, players, me }: { token: string; players: P[]; me: number | null }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(respond.bind(null, token), null);
  const [player, setPlayer] = useState(me ? String(me) : "");
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
              {p.status === "in" ? " (in)" : p.status === "out" ? " (out)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          name="status"
          value="in"
          disabled={pending || !player}
          className={`min-h-[52px] rounded-xl text-[15px] font-bold disabled:opacity-40 ${
            current === "in" ? "bg-accent text-ground ring-2 ring-accent ring-offset-2 ring-offset-surface" : "bg-accent text-ground"
          }`}
        >
          I&apos;m in
        </button>
        <button
          name="status"
          value="out"
          disabled={pending || !player}
          className={`min-h-[52px] rounded-xl border text-[15px] font-semibold disabled:opacity-40 ${
            current === "out" ? "border-danger bg-danger-dim text-danger" : "border-line bg-surface-2 text-fg"
          }`}
        >
          Can&apos;t make it
        </button>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {current && !pending && (
        <p className="text-center text-sm text-muted">
          You&apos;re marked <b className={current === "in" ? "text-accent" : "text-danger"}>{current}</b>. Tap the other button to change.
        </p>
      )}
    </form>
  );
}
