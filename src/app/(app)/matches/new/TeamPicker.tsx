"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { PosBadge, formatDate } from "@/components/ui";
import { balanceTeams, teamTotals, type TeamOption } from "@/lib/balance";
import type { Position } from "@/lib/positions";
import { createMatch } from "../actions";
import { addGuest } from "../../players/actions";
import { POSITIONS } from "@/lib/positions";
import { CopyTeamsButton } from "@/components/CopyTeamsButton";
import { TEAMS, other } from "@/lib/teams";

type P = { id: number; name: string; position: Position; strength: number; attack: number; defence: number; isGuest?: boolean };

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function verdict(diff: number) {
  return diff <= 0.5 ? "Very even" : diff <= 1.5 ? "Even" : diff <= 3 ? "Slightly uneven" : "Uneven";
}

export function TeamPicker({
  players: initialPlayers,
  previous,
  preselected,
  matchId,
  initialDate,
  squadNote,
}: {
  players: P[];
  previous: Record<number, "A" | "B">;
  preselected: number[];
  /** set when picking teams for an already planned match */
  matchId?: number;
  initialDate?: string;
  squadNote?: string;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const byId = useMemo(() => new Set(initialPlayers.map((p) => p.id)), [initialPlayers]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(preselected.filter((id) => byId.has(id))));
  const [date, setDate] = useState(() => initialDate ?? today());
  const [guestOpen, setGuestOpen] = useState(false);
  const [guest, setGuest] = useState({ name: "", level: 5, position: "MID" as Position });
  const [guestError, setGuestError] = useState<string | null>(null);
  const [addingGuest, startAddingGuest] = useTransition();
  const [options, setOptions] = useState<TeamOption[]>([]);
  const [optionIdx, setOptionIdx] = useState(0);
  const [teamA, setTeamA] = useState<number[] | null>(null); // current (possibly hand-edited) split
  const [showSquad, setShowSquad] = useState(true);
  const [picked, setPicked] = useState<number | null>(null); // first player tapped for a swap
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const chosen = players.filter((p) => selected.has(p.id));
  const members = players.filter((p) => !p.isGuest);
  const guests = players.filter((p) => p.isGuest);

  function submitGuest() {
    startAddingGuest(async () => {
      const res = await addGuest(guest);
      if ("error" in res) return setGuestError(res.error);
      setPlayers((ps) => [...ps, res.guest]);
      setSelected((s) => new Set(s).add(res.guest.id));
      resetTeams();
      setGuest({ name: "", level: 5, position: "MID" });
      setGuestError(null);
      setGuestOpen(false);
    });
  }
  const n = chosen.length;

  function resetTeams() {
    setTeamA(null);
    setOptions([]);
    setPicked(null);
  }

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    resetTeams();
  }

  function generate() {
    const prev = new Map(Object.entries(previous).map(([k, v]) => [Number(k), v]));
    const opts = balanceTeams(chosen, { previous: prev, count: 3 });
    setOptions(opts);
    setOptionIdx(0);
    setTeamA(opts[0]?.teamA ?? null);
    setShowSquad(false);
    setError(null);
    setPicked(null);
  }

  function pickOption(i: number) {
    setOptionIdx(i);
    setTeamA(options[i].teamA);
    setPicked(null);
  }

  /** Tap one player, then one on the other team, to swap them. */
  function tap(id: number) {
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

  function save() {
    if (!split) return;
    startSaving(async () => {
      const res = await createMatch({ matchId, date, teamA: split.a.map((p) => p.id), teamB: split.b.map((p) => p.id) });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="h1">Pick teams</h1>
          <span className="text-xs text-muted">
            {formatDate(date)} · {n} player{n === 1 ? "" : "s"}
          </span>
        </div>
        {split && (
          <button type="button" className="btn-secondary min-h-10 rounded-full" onClick={() => setShowSquad((s) => !s)}>
            {showSquad ? "Hide squad" : "Edit squad"}
          </button>
        )}
      </div>

      {(showSquad || !split) && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <button type="button" className="btn-secondary" onClick={() => { setSelected(new Set(members.map((p) => p.id))); resetTeams(); }}>
              All
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setSelected(new Set()); resetTeams(); }}>
              None
            </button>
          </div>

          <div>
            <div className="label">
              Who&apos;s playing? {n >= 2 && <span className="text-accent">· {Math.floor(n / 2)} v {Math.ceil(n / 2)}</span>}
            </div>
            {squadNote && <p className="mb-2 text-xs text-muted">{squadNote}</p>}
            <SquadGrid players={members} selected={selected} toggle={toggle} />
            {guests.length > 0 && (
              <>
                <div className="label mt-3">Guests</div>
                <SquadGrid players={guests} selected={selected} toggle={toggle} />
              </>
            )}
          </div>

          {guestOpen ? (
            <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-36 flex-[2]">
                  <label className="label" htmlFor="guest-name">Guest name</label>
                  <input
                    id="guest-name"
                    className="input bg-surface"
                    value={guest.name}
                    autoFocus
                    onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                  />
                </div>
                <div className="min-w-20 flex-1">
                  <label className="label" htmlFor="guest-level">Level</label>
                  <select
                    id="guest-level"
                    className="input bg-surface"
                    value={guest.level}
                    onChange={(e) => setGuest({ ...guest, level: Number(e.target.value) })}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-20 flex-1">
                  <label className="label" htmlFor="guest-pos">Position</label>
                  <select
                    id="guest-pos"
                    className="input bg-surface"
                    value={guest.position}
                    onChange={(e) => setGuest({ ...guest, position: e.target.value as Position })}
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>
              {guestError && <p className="text-sm text-danger">{guestError}</p>}
              <div className="flex gap-2">
                <button type="button" className="btn" disabled={addingGuest || !guest.name.trim()} onClick={submitGuest}>
                  {addingGuest ? "Adding…" : "Add guest"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setGuestOpen(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" className="text-sm font-semibold text-accent" onClick={() => setGuestOpen(true)}>
              + Add a guest
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn flex-1 sm:flex-none" disabled={n < 4} onClick={generate}>
              {options.length ? "Regenerate" : "Generate fair teams"}
            </button>
            {n > 0 && n < 10 && <span className="text-sm text-warn">Usually 10+ players (5 v 5)</span>}
          </div>
        </section>
      )}

      {split && (
        <>
          <section className="space-y-2">
            <div className="grid grid-cols-3 items-end">
              <span className="num text-[40px] leading-none font-extrabold text-team-a">{split.totalA.toFixed(1)}</span>
              <span className="flex flex-col items-center gap-0.5 pb-1 text-center">
                <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">Balance</span>
                <span className="text-sm font-semibold">{verdict(split.diff)}</span>
              </span>
              <span className="num text-right text-[40px] leading-none font-extrabold text-team-b">{split.totalB.toFixed(1)}</span>
            </div>
            <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full">
              <div className="rounded-full bg-team-a transition-all" style={{ flex: split.totalA || 1 }} />
              <div className="rounded-full bg-team-b transition-all" style={{ flex: split.totalB || 1 }} />
            </div>
          </section>

          {options.length > 1 && (
            <div role="group" aria-label="Options" className="flex gap-1.5">
              {options.map((o, i) => {
                const on = i === optionIdx && !edited;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pickOption(i)}
                    className={`min-h-11 flex-1 rounded-xl text-[13px] font-semibold ${
                      on ? "bg-fg text-ground" : "border border-line bg-surface text-soft"
                    }`}
                  >
                    {i === 0 ? "Best" : `Alt ${i + 1}`} · {o.diff.toFixed(1)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {(["A", "B"] as const).map((t) => {
              const team = t === "A" ? split.a : split.b;
              return (
                <section
                  key={t}
                  className={`overflow-hidden rounded-2xl border border-t-[3px] border-line bg-surface ${TEAMS[t].borderTop}`}
                >
                  <div className="flex items-baseline justify-between px-3 pt-3 pb-1.5">
                    <h2 className={`font-display text-xl font-extrabold uppercase ${TEAMS[t].text}`}>{TEAMS[t].name}</h2>
                    <span className="text-xs text-muted">{team.length}</span>
                  </div>
                  <ul>
                    {team.map((p) => {
                      const sel = picked === p.id;
                      return (
                        <li
                          key={p.id}
                          className={`flex items-center border-t border-line-soft ${sel ? "bg-accent-dim shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => tap(p.id)}
                            aria-pressed={sel}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 pl-3 text-left"
                          >
                            <span className="w-7 shrink-0 text-[10px] font-bold text-muted">{p.position}</span>
                            <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                            <span className="text-[13px] text-muted tabular-nums">{p.strength.toFixed(1)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => move(p.id)}
                            aria-label={`Move ${p.name} to ${TEAMS[other(t)].name}`}
                            title={`Move to ${TEAMS[other(t)].name}`}
                            className="flex h-11 w-8 shrink-0 items-center justify-center text-subtle hover:text-fg"
                          >
                            <Icon name="arrowRight" size={14} className={t === "B" ? "rotate-180" : ""} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted">
            {picked !== null
              ? "Now tap a player on the other team to swap them."
              : edited
                ? "Edited by hand · tap two players on different teams to swap"
                : "Tap two players on different teams to swap them · arrows move one across"}
          </p>
          {Math.abs(split.a.length - split.b.length) > 1 && (
            <p className="text-center text-sm text-warn">Team sizes differ by more than one.</p>
          )}
          {error && <p className="text-center text-sm text-danger">{error}</p>}

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2.5 border-t border-line-soft bg-ground/95 px-4 py-3 backdrop-blur md:bottom-0">
            <CopyTeamsButton
              date={date}
              blue={split.a.map((p) => p.name)}
              orange={split.b.map((p) => p.name)}
              className="btn-secondary min-h-[52px] flex-1 text-[15px]"
            />
            <button
              type="button"
              className="btn min-h-[52px] flex-[1.4] text-[15px] font-bold"
              onClick={save}
              disabled={saving || !split.a.length || !split.b.length}
            >
              {saving ? "Saving…" : "Save match"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SquadGrid({ players, selected, toggle }: { players: P[]; selected: Set<number>; toggle: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {players.map((p) => {
        const on = selected.has(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(p.id)}
            className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 text-left text-sm transition ${
              on ? "border-accent/60 bg-accent-dim font-semibold text-fg" : "border-line bg-surface-2 text-muted"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                on ? "bg-accent text-ground" : "border border-subtle"
              }`}
            >
              {on && "✓"}
            </span>
            <span className="flex-1 truncate">{p.name}</span>
            <PosBadge position={p.position} />
          </button>
        );
      })}
    </div>
  );
}
