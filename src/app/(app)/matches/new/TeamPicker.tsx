"use client";

import { useMemo, useState, useTransition } from "react";
import type { Position } from "@/lib/positions";
import { PosBadge } from "@/components/ui";
import { balanceTeams, teamTotals, type TeamOption } from "@/lib/balance";
import { createMatch } from "../actions";

type P = { id: number; name: string; position: Position; strength: number; attack: number; defence: number };

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function TeamPicker({
  players,
  previous,
  preselected,
}: {
  players: P[];
  previous: Record<number, "A" | "B">;
  preselected: number[];
}) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(preselected.filter((id) => byId.has(id))),
  );
  const [date, setDate] = useState(today);
  const [options, setOptions] = useState<TeamOption[]>([]);
  const [optionIdx, setOptionIdx] = useState(0);
  const [teamA, setTeamA] = useState<number[] | null>(null); // current (possibly hand-edited) split
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [picked, setPicked] = useState<number | null>(null); // first player chosen for a swap
  const [saving, startSaving] = useTransition();

  const chosen = players.filter((p) => selected.has(p.id));
  const n = chosen.length;

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setTeamA(null);
    setOptions([]);
    setPicked(null);
  }

  function generate() {
    const prev = new Map(Object.entries(previous).map(([k, v]) => [Number(k), v]));
    const opts = balanceTeams(chosen, { previous: prev, count: 3 });
    setOptions(opts);
    setOptionIdx(0);
    setTeamA(opts[0]?.teamA ?? null);
    setError(null);
    setPicked(null);
  }

  function pickOption(i: number) {
    setOptionIdx(i);
    setTeamA(options[i].teamA);
    setPicked(null);
  }

  /** Tap one player, then one on the other team, to swap them. */
  function swapTap(id: number) {
    if (!teamA) return;
    if (picked === null || picked === id || teamA.includes(picked) === teamA.includes(id)) {
      setPicked(picked === id ? null : id);
      return;
    }
    const inA = teamA.includes(id) ? id : picked;
    const inB = inA === id ? picked : id;
    setTeamA([...teamA.filter((x) => x !== inA), inB]);
    setPicked(null);
  }

  /** Move a single player across (changes team sizes). */
  function move(id: number) {
    if (!teamA) return;
    setTeamA(teamA.includes(id) ? teamA.filter((x) => x !== id) : [...teamA, id]);
    setPicked(null);
  }

  const split = useMemo(() => {
    if (!teamA) return null;
    const aSet = new Set(teamA);
    const sortFn = (x: P, y: P) => y.strength - x.strength;
    const a = chosen.filter((p) => aSet.has(p.id)).sort(sortFn);
    const b = chosen.filter((p) => !aSet.has(p.id)).sort(sortFn);
    return { a, b, ...teamTotals(chosen, teamA) };
  }, [teamA, chosen]);

  const edited =
    !!teamA && !!options[optionIdx] && [...teamA].sort().join() !== [...options[optionIdx].teamA].sort().join();

  function copyText() {
    if (!split) return;
    const list = (ps: P[]) => ps.map((p) => `• ${p.name}`).join("\n");
    const text = `⚽ ${date}\n\n*Team A* (${split.a.length})\n${list(split.a)}\n\n*Team B* (${split.b.length})\n${list(split.b)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function save() {
    if (!split) return;
    startSaving(async () => {
      const res = await createMatch({ date, teamA: split.a.map((p) => p.id), teamB: split.b.map((p) => p.id) });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => { setSelected(new Set(players.map((p) => p.id))); setTeamA(null); setOptions([]); }}>
              All
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setSelected(new Set()); setTeamA(null); setOptions([]); }}>
              None
            </button>
          </div>
        </div>

        <div>
          <div className="label">Who&apos;s playing? ({n} selected{n >= 2 ? ` → ${Math.floor(n / 2)} v ${Math.ceil(n / 2)}` : ""})</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {players.map((p) => {
              const on = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                    on ? "border-pitch-700 bg-pitch-50 font-semibold" : "border-black/10 bg-white text-neutral-500"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${on ? "border-pitch-700 bg-pitch-700 text-white" : "border-black/25"}`}>
                    {on && "✓"}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <PosBadge position={p.position} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn" disabled={n < 4} onClick={generate}>
            {options.length ? "Regenerate" : "Generate fair teams"}
          </button>
          {n < 10 && n > 0 && <span className="text-sm text-amber-700">Usually 10+ players (5 v 5)</span>}
        </div>
      </section>

      {split && (
        <section className="space-y-4">
          {options.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickOption(i)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    i === optionIdx && !edited ? "border-pitch-700 bg-pitch-700 text-white" : "border-black/10 bg-white"
                  }`}
                >
                  Option {i + 1}{i === 0 ? " (best)" : ""} <span className="opacity-70">· diff {o.diff.toFixed(1)}</span>
                </button>
              ))}
              {edited && <span className="self-center text-sm text-neutral-500">(edited by hand)</span>}
              <p className="w-full text-xs text-neutral-500">
                Ranked by strength difference plus how evenly keepers, positions and attack/defence are spread.
              </p>
            </div>
          )}

          <BalanceBar a={split.totalA} b={split.totalB} />
          <p className="text-xs text-neutral-500">
            {picked !== null
              ? "Now tap ⇄ on a player in the other team to swap them."
              : "Tap ⇄ on a player, then on one in the other team, to swap them. Use →/← to move one player across."}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {(["A", "B"] as const).map((t) => {
              const team = t === "A" ? split.a : split.b;
              const total = t === "A" ? split.totalA : split.totalB;
              return (
                <div key={t} className={`card border-t-4 ${t === "A" ? "border-t-pitch-600" : "border-t-sky-600"}`}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="h2">Team {t} <span className="text-sm font-normal text-neutral-500">({team.length})</span></h2>
                    <span className="text-sm text-neutral-500">
                      total <b className="text-neutral-800">{total.toFixed(1)}</b> · avg {(total / Math.max(1, team.length)).toFixed(2)}
                    </span>
                  </div>
                  <ul className="divide-y divide-black/5">
                    {team.map((p) => (
                      <li
                        key={p.id}
                        className={`flex items-center gap-2 py-1.5 text-sm ${picked === p.id ? "-mx-2 rounded bg-amber-100 px-2" : ""}`}
                      >
                        <PosBadge position={p.position} />
                        <span className="flex-1">{p.name}</span>
                        <span className="w-8 text-right tabular-nums text-neutral-500">{p.strength.toFixed(1)}</span>
                        <button
                          type="button"
                          onClick={() => swapTap(p.id)}
                          className={`rounded px-2 py-0.5 hover:bg-black/5 ${picked === p.id ? "font-bold text-amber-800" : "text-neutral-500"}`}
                          title="Swap with a player on the other team"
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          onClick={() => move(p.id)}
                          className="rounded px-2 py-0.5 text-neutral-400 hover:bg-black/5"
                          title={`Move to team ${t === "A" ? "B" : "A"}`}
                        >
                          {t === "A" ? "→" : "←"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {Math.abs(split.a.length - split.b.length) > 1 && (
            <p className="text-sm text-amber-700">Team sizes differ by more than one.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={save} disabled={saving || !split.a.length || !split.b.length}>
              {saving ? "Saving…" : "Save match"}
            </button>
            <button type="button" className="btn-secondary" onClick={copyText}>
              {copied ? "Copied ✓" : "Copy for WhatsApp"}
            </button>
            {error && <span className="self-center text-sm text-red-600">{error}</span>}
          </div>
        </section>
      )}
    </div>
  );
}

function BalanceBar({ a, b }: { a: number; b: number }) {
  const pct = a + b > 0 ? (a / (a + b)) * 100 : 50;
  const diff = Math.abs(a - b);
  const verdict = diff <= 0.5 ? "Very even" : diff <= 1.5 ? "Even" : diff <= 3 ? "Slightly uneven" : "Uneven";
  return (
    <div className="card py-3">
      <div className="mb-1.5 flex justify-between text-xs font-semibold">
        <span className="text-pitch-700">A {a.toFixed(1)}</span>
        <span className="text-neutral-600">{verdict} · diff {diff.toFixed(1)}</span>
        <span className="text-sky-700">B {b.toFixed(1)}</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-sky-600">
        <div className="bg-pitch-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
