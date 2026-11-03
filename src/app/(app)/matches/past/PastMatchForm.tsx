"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PosBadge, formatDate } from "@/components/ui";
import { POSITIONS, type Position } from "@/lib/positions";
import { TEAMS, type TeamKey } from "@/lib/teams";
import { addGuest } from "../../players/actions";
import { addPastMatch } from "../actions";

type P = { id: number; name: string; position: Position; isGuest: boolean };
type Recent = { id: number; date: string; scoreA: number; scoreB: number };

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const num = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s)) || 0));

export function PastMatchForm({
  players: initialPlayers,
  today,
  seasonStart,
  recent: initialRecent,
}: {
  players: P[];
  today: string;
  seasonStart?: string;
  recent: Recent[];
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [recent, setRecent] = useState(initialRecent);
  const [date, setDate] = useState(today);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [team, setTeam] = useState<Record<number, TeamKey>>({});
  const [goals, setGoals] = useState<Record<number, string>>({});
  const [assists, setAssists] = useState<Record<number, string>>({});
  const [motm, setMotm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Recent | null>(null);
  const [saving, startSaving] = useTransition();
  const [guestName, setGuestName] = useState("");
  const [guestLevel, setGuestLevel] = useState(5);
  const [guestPos, setGuestPos] = useState<Position>("MID");
  const [guestOpen, setGuestOpen] = useState(false);
  const [addingGuest, startAddingGuest] = useTransition();

  const inTeam = (t: TeamKey) => players.filter((p) => team[p.id] === t);
  const blue = inTeam("A");
  const orange = inTeam("B");
  const members = players.filter((p) => !p.isGuest);
  const guests = players.filter((p) => p.isGuest);

  function assign(id: number, t: TeamKey | null) {
    setTeam((m) => {
      const next = { ...m };
      if (t) next[id] = t;
      else delete next[id];
      return next;
    });
    if (!t && motm === String(id)) setMotm("");
  }

  function submitGuest() {
    startAddingGuest(async () => {
      const res = await addGuest({ name: guestName, level: guestLevel, position: guestPos });
      if ("error" in res) return setError(res.error);
      setPlayers((ps) => [...ps, { id: res.guest.id, name: res.guest.name, position: res.guest.position, isGuest: true }]);
      setGuestName("");
      setGuestOpen(false);
    });
  }

  function save() {
    setError(null);
    const selected = [...blue, ...orange];
    startSaving(async () => {
      const res = await addPastMatch({
        date,
        scoreA: num(scoreA),
        scoreB: num(scoreB),
        players: selected.map((p) => ({ playerId: p.id, team: team[p.id], goals: num(goals[p.id] ?? ""), assists: num(assists[p.id] ?? "") })),
        motmPlayerId: motm ? Number(motm) : null,
      });
      if ("error" in res) return setError(res.error);
      const entry = { id: res.id, date, scoreA: num(scoreA)!, scoreB: num(scoreB)! };
      setSaved(entry);
      setRecent((r) => [entry, ...r].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8));
      // ready for the next one: a week later, empty line-up
      const next = addDays(date, 7);
      setDate(next > today ? today : next);
      setScoreA("");
      setScoreB("");
      setTeam({});
      setGoals({});
      setAssists({});
      setMotm("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-col gap-1">
        <Link href="/matches" className="text-sm text-muted hover:underline">← Matches</Link>
        <h1 className="h1">Add past match</h1>
        <span className="text-xs text-muted">
          For games already played. Enter them in any order; stats and strengths recalculate by date.
        </span>
      </div>

      {saved && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent-dim px-4 py-3 text-sm">
          <span className="flex-1">
            Saved {formatDate(saved.date)}: <b className={TEAMS.A.text}>{TEAMS.A.name} {saved.scoreA}</b>–
            <b className={TEAMS.B.text}>{saved.scoreB} {TEAMS.B.name}</b>. Next one is ready below.
          </span>
          <Link href={`/matches/${saved.id}`} className="font-semibold text-accent">View</Link>
        </div>
      )}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-40 flex-1">
            <label className="label" htmlFor="date">Date played</label>
            <input id="date" type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            {seasonStart && date < seasonStart && <p className="mt-1 text-xs text-warn">Before this season started</p>}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className={`label ${TEAMS.A.text}`} htmlFor="scoreA">{TEAMS.A.name}</label>
              <input id="scoreA" inputMode="numeric" type="number" min={0} className="input w-20 text-center text-xl font-bold" value={scoreA} onChange={(e) => setScoreA(e.target.value)} />
            </div>
            <span className="pb-2.5 text-xl font-bold text-subtle">–</span>
            <div>
              <label className={`label ${TEAMS.B.text}`} htmlFor="scoreB">{TEAMS.B.name}</label>
              <input id="scoreB" inputMode="numeric" type="number" min={0} className="input w-20 text-center text-xl font-bold" value={scoreB} onChange={(e) => setScoreB(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="h2">Who played</h2>
          <span className="text-xs text-muted">
            <span className={TEAMS.A.text}>{TEAMS.A.name} {blue.length}</span> · <span className={TEAMS.B.text}>{TEAMS.B.name} {orange.length}</span>
          </span>
        </div>
        <LineupPicker players={members} team={team} assign={assign} />
        {guests.length > 0 && (
          <>
            <div className="label mt-2">Guests</div>
            <LineupPicker players={guests} team={team} assign={assign} />
          </>
        )}
        {guestOpen ? (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface-2 p-3">
            <div className="min-w-32 flex-[2]">
              <label className="label" htmlFor="g-name">Guest name</label>
              <input id="g-name" className="input bg-surface" value={guestName} autoFocus onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div className="w-20">
              <label className="label" htmlFor="g-level">Level</label>
              <select id="g-level" className="input bg-surface" value={guestLevel} onChange={(e) => setGuestLevel(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className="label" htmlFor="g-pos">Position</label>
              <select id="g-pos" className="input bg-surface" value={guestPos} onChange={(e) => setGuestPos(e.target.value as Position)}>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button type="button" className="btn" disabled={addingGuest || !guestName.trim()} onClick={submitGuest}>Add</button>
            <button type="button" className="btn-secondary" onClick={() => setGuestOpen(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="text-sm font-semibold text-accent" onClick={() => setGuestOpen(true)}>+ Add a guest</button>
        )}
      </section>

      {(blue.length > 0 || orange.length > 0) && (
        <section className="card space-y-3">
          <div>
            <h2 className="h2">Goals, assists &amp; MOTM</h2>
            <p className="text-xs text-muted">All optional. Leave blank if you don&apos;t remember.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {([["A", blue], ["B", orange]] as const).map(([t, list]) => (
              <div key={t}>
                <div className="mb-1 grid grid-cols-[1fr_3.5rem_3.5rem] gap-2 text-[10px] font-semibold tracking-wider text-muted uppercase">
                  <span className={TEAMS[t].text}>{TEAMS[t].name}</span>
                  <span className="text-center">Goals</span>
                  <span className="text-center">Ast</span>
                </div>
                <ul className="space-y-1">
                  {list.map((p) => (
                    <li key={p.id} className="grid grid-cols-[1fr_3.5rem_3.5rem] items-center gap-2 text-sm">
                      <span className="truncate">{p.name}</span>
                      <input aria-label={`${p.name} goals`} type="number" min={0} inputMode="numeric" className="input min-h-10 px-1 text-center" value={goals[p.id] ?? ""} onChange={(e) => setGoals((g) => ({ ...g, [p.id]: e.target.value }))} />
                      <input aria-label={`${p.name} assists`} type="number" min={0} inputMode="numeric" className="input min-h-10 px-1 text-center" value={assists[p.id] ?? ""} onChange={(e) => setAssists((a) => ({ ...a, [p.id]: e.target.value }))} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="motm">Man of the match</label>
            <select id="motm" className="input" value={motm} onChange={(e) => setMotm(e.target.value)}>
              <option value="">—</option>
              {([["A", blue], ["B", orange]] as const).map(([t, list]) => (
                <optgroup key={t} label={TEAMS[t].name}>
                  {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="card">
          <h2 className="h2 mb-2">Already entered</h2>
          <ul className="divide-y divide-line-soft text-sm">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5">
                <Link href={`/matches/${m.id}`} className={`hover:text-accent ${m.date === date ? "font-semibold text-warn" : ""}`}>
                  {formatDate(m.date)}
                  {m.date === date && " · same date as above"}
                </Link>
                <span className="num text-lg">
                  <span className={TEAMS.A.text}>{m.scoreA}</span>–<span className={TEAMS.B.text}>{m.scoreB}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 space-y-2 border-t border-line-soft bg-ground/95 px-4 py-3 backdrop-blur md:bottom-0">
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="button" className="btn min-h-[52px] w-full text-[15px] font-bold" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save match"}
        </button>
      </div>
    </div>
  );
}

function LineupPicker({
  players,
  team,
  assign,
}: {
  players: P[];
  team: Record<number, TeamKey>;
  assign: (id: number, t: TeamKey | null) => void;
}) {
  const seg = (on: boolean, t: TeamKey | null) =>
    `min-h-10 flex-1 rounded-lg text-xs font-semibold transition ${
      on ? (t === "A" ? "bg-team-a text-ground" : t === "B" ? "bg-team-b text-ground" : "bg-surface text-fg") : "text-muted hover:text-fg"
    }`;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {players.map((p) => {
        const t = team[p.id] ?? null;
        return (
          <li key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1 pr-1 pl-2.5">
            <PosBadge position={p.position} />
            <span className={`flex-1 truncate text-sm ${t ? "font-semibold text-fg" : "text-soft"}`}>{p.name}</span>
            <div role="group" aria-label={`${p.name}'s team`} className="flex w-[9.5rem] gap-0.5 rounded-lg bg-ground/40 p-0.5">
              <button type="button" aria-pressed={t === null} className={seg(t === null, null)} onClick={() => assign(p.id, null)}>
                —
              </button>
              <button type="button" aria-pressed={t === "A"} className={seg(t === "A", "A")} onClick={() => assign(p.id, "A")}>
                {TEAMS.A.name}
              </button>
              <button type="button" aria-pressed={t === "B"} className={seg(t === "B", "B")} onClick={() => assign(p.id, "B")}>
                {TEAMS.B.name}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
