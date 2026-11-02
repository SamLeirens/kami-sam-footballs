import { ELO_START } from "./rating";

export type Result = "W" | "D" | "L";

export type StatsMatch = {
  id: number;
  date: string;
  scoreA: number | null;
  scoreB: number | null;
  motmPlayerId?: number | null;
};
export type StatsEntry = {
  matchId: number;
  playerId: number;
  team: "A" | "B";
  goals: number | null;
  assists: number | null;
};

export type PlayerStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** wins / played, 0-100 */
  winPct: number;
  goals: number;
  assists: number;
  /** man of the match awards */
  motm: number;
  /** most recent first, max 5 */
  form: Result[];
  elo: number;
};

const K = 24;

export function emptyStats(): PlayerStats {
  return { played: 0, wins: 0, draws: 0, losses: 0, winPct: 0, goals: 0, assists: 0, motm: 0, form: [], elo: ELO_START };
}

export function isPlayed<M extends { scoreA: number | null; scoreB: number | null }>(
  m: M,
): m is M & { scoreA: number; scoreB: number } {
  return m.scoreA !== null && m.scoreB !== null;
}

export function resultFor(m: { scoreA: number; scoreB: number }, team: "A" | "B"): Result {
  if (m.scoreA === m.scoreB) return "D";
  return (m.scoreA > m.scoreB) === (team === "A") ? "W" : "L";
}

/** Replays every played match in date order to build per-player stats and Elo. */
export function computeStats(matches: StatsMatch[], entries: StatsEntry[]): Map<number, PlayerStats> {
  const stats = new Map<number, PlayerStats>();
  const get = (id: number) => {
    let s = stats.get(id);
    if (!s) stats.set(id, (s = emptyStats()));
    return s;
  };

  const byMatch = new Map<number, StatsEntry[]>();
  for (const e of entries) {
    const list = byMatch.get(e.matchId) ?? [];
    list.push(e);
    byMatch.set(e.matchId, list);
  }

  const played = matches
    .filter(isPlayed)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  for (const m of played) {
    const list = byMatch.get(m.id) ?? [];
    const teamA = list.filter((e) => e.team === "A");
    const teamB = list.filter((e) => e.team === "B");
    if (teamA.length === 0 || teamB.length === 0) continue;

    const avgElo = (t: StatsEntry[]) => t.reduce((s, e) => s + get(e.playerId).elo, 0) / t.length;
    const eloA = avgElo(teamA);
    const eloB = avgElo(teamB);
    const expectedA = 1 / (1 + 10 ** ((eloB - eloA) / 400));
    const actualA = m.scoreA > m.scoreB ? 1 : m.scoreA === m.scoreB ? 0.5 : 0;
    const delta = K * (actualA - expectedA);

    for (const e of list) {
      const s = get(e.playerId);
      const r = resultFor(m, e.team);
      s.played++;
      if (r === "W") s.wins++;
      else if (r === "D") s.draws++;
      else s.losses++;
      s.goals += e.goals ?? 0;
      s.assists += e.assists ?? 0;
      s.form.unshift(r);
      if (s.form.length > 5) s.form.pop();
      s.elo += e.team === "A" ? delta : -delta;
      if (m.motmPlayerId === e.playerId) s.motm++;
    }
  }

  for (const s of stats.values()) {
    s.winPct = s.played ? Math.round((s.wins / s.played) * 1000) / 10 : 0;
    s.elo = Math.round(s.elo);
  }
  return stats;
}

export type Record3 = { played: number; wins: number; draws: number; losses: number };
export type PairRecord = { with: Record3; against: Record3 };

const rec = (): Record3 => ({ played: 0, wins: 0, draws: 0, losses: 0 });
export const winPct = (r: Record3) => (r.played ? Math.round((r.wins / r.played) * 1000) / 10 : 0);

/**
 * For every player, their record alongside and against every other player.
 * pairs.get(a).get(b).with = a's results when on b's team; .against = a's results when facing b.
 */
export function computePairs(matches: StatsMatch[], entries: StatsEntry[]): Map<number, Map<number, PairRecord>> {
  const pairs = new Map<number, Map<number, PairRecord>>();
  const get = (a: number, b: number) => {
    let m = pairs.get(a);
    if (!m) pairs.set(a, (m = new Map()));
    let r = m.get(b);
    if (!r) m.set(b, (r = { with: rec(), against: rec() }));
    return r;
  };
  const byMatch = new Map<number, StatsEntry[]>();
  for (const e of entries) byMatch.set(e.matchId, [...(byMatch.get(e.matchId) ?? []), e]);

  for (const m of matches) {
    if (!isPlayed(m)) continue;
    const list = byMatch.get(m.id) ?? [];
    for (const a of list) {
      const res = resultFor(m, a.team);
      for (const b of list) {
        if (a.playerId === b.playerId) continue;
        const r = get(a.playerId, b.playerId)[a.team === b.team ? "with" : "against"];
        r.played++;
        if (res === "W") r.wins++;
        else if (res === "D") r.draws++;
        else r.losses++;
      }
    }
  }
  return pairs;
}

/** Unique duos (a < b) who played together, best win % first. */
export function bestDuos(pairs: Map<number, Map<number, PairRecord>>, minGames: number) {
  const out: { a: number; b: number; rec: Record3; winPct: number }[] = [];
  for (const [a, m] of pairs)
    for (const [b, r] of m)
      if (a < b && r.with.played >= minGames) out.push({ a, b, rec: r.with, winPct: winPct(r.with) });
  return out.sort((x, y) => y.winPct - x.winPct || y.rec.played - x.rec.played);
}
