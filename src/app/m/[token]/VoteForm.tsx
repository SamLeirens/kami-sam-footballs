"use client";

import { useActionState, useState } from "react";
import { TEAMS } from "@/lib/teams";
import { castVote, type VoteState } from "./actions";

type P = { id: number; name: string; team: "A" | "B"; voted: boolean };

export function VoteForm({ token, players }: { token: string; players: P[] }) {
  const [state, action, pending] = useActionState<VoteState, FormData>(castVote.bind(null, token), null);
  const [voter, setVoter] = useState("");
  const [candidate, setCandidate] = useState("");

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="voter">1. Who are you?</label>
        <select id="voter" name="voter" className="input" value={voter} onChange={(e) => { setVoter(e.target.value); if (e.target.value === candidate) setCandidate(""); }}>
          <option value="">Select your name…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.voted}>
              {p.name}{p.voted ? " (already voted)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="candidate">2. Your man of the match</label>
        <select id="candidate" name="candidate" className="input" value={candidate} onChange={(e) => setCandidate(e.target.value)} disabled={!voter}>
          <option value="">{voter ? "Select a player…" : "Pick your name first"}</option>
          {(["A", "B"] as const).map((t) => (
            <optgroup key={t} label={TEAMS[t].name}>
              {players
                .filter((p) => p.team === t && String(p.id) !== voter)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn w-full" disabled={pending || !voter || !candidate}>
        {pending ? "Voting…" : "Cast vote"}
      </button>
      <p className="text-center text-xs text-muted">One vote per player. Everyone can see who has voted.</p>
    </form>
  );
}
