"use client";

import { useActionState, useState } from "react";
import { POSITIONS, type Position } from "@/lib/positions";
import { ATTRIBUTES, overall, type Attributes } from "@/lib/rating";
import type { FormState } from "@/app/(app)/players/actions";

type Initial = Attributes & { name: string; position: Position; active?: boolean; isGuest?: boolean };

const DEFAULTS: Initial = {
  name: "",
  position: "MID",
  attack: 5,
  defence: 5,
  passing: 5,
  fitness: 5,
  goalkeeping: 3,
};

export function PlayerForm({
  action,
  initial = DEFAULTS,
  submitLabel,
  showActive,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: Initial;
  submitLabel: string;
  showActive?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const isCreate = !showActive;
  // After adding a player, remount the fields so the form is blank for the next one.
  const fieldsKey = isCreate ? (state?.ok ?? 0) : 0;

  return (
    <form action={formAction} className="space-y-4">
      <Fields key={fieldsKey} initial={initial} showActive={showActive} autoFocus={isCreate && !!state?.ok} />
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
        {state?.ok && !pending && <span className="text-sm text-accent">Saved ✓</span>}
      </div>
    </form>
  );
}

function Fields({ initial, showActive, autoFocus }: { initial: Initial; showActive?: boolean; autoFocus: boolean }) {
  const [values, setValues] = useState(initial);
  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            required
            autoFocus={autoFocus}
            className="input"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div>
          <span className="label">Position</span>
          <div className="flex gap-1">
            {POSITIONS.map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${
                  values.position === p ? "border-accent bg-accent text-ground" : "border-line bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="position"
                  value={p}
                  checked={values.position === p}
                  onChange={() => set("position", p)}
                  className="sr-only"
                />
                {p}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {ATTRIBUTES.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor={key}>{label}</label>
              <span className="font-mono text-sm font-bold">{values[key]}</span>
            </div>
            <input
              id={key}
              name={key}
              type="range"
              min={1}
              max={10}
              value={values[key]}
              onChange={(e) => set(key, Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        ))}
        <div className="flex items-end justify-between rounded-lg bg-accent-dim px-3 py-2">
          <span className="label mb-0">Overall</span>
          <span className="text-2xl font-bold text-accent">{overall(values)}</span>
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isGuest"
          checked={values.isGuest ?? false}
          onChange={(e) => set("isGuest", e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Guest <span className="text-muted">(plays now and then; left out of club stats)</span>
      </label>

      {showActive && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            checked={values.active ?? true}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Active (shows up when picking teams)
        </label>
      )}
    </>
  );
}
