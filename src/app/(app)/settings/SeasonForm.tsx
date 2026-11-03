"use client";

import { useActionState } from "react";
import { addSeason, type SeasonState } from "./actions";

export function SeasonForm({ suggestedName, suggestedStart }: { suggestedName: string; suggestedStart: string }) {
  const [state, action, pending] = useActionState<SeasonState, FormData>(addSeason, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-32 flex-1">
        <label className="label" htmlFor="season-name">Name</label>
        <input id="season-name" name="name" className="input" defaultValue={suggestedName} required />
      </div>
      <div className="min-w-40 flex-1">
        <label className="label" htmlFor="season-start">Starts on</label>
        <input id="season-start" name="startDate" type="date" className="input" defaultValue={suggestedStart} required />
      </div>
      <button className="btn" disabled={pending}>Add season</button>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
