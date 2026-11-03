import type { Position } from "@/lib/positions";

export type BalancePlayer = {
  id: number;
  strength: number;
  position: Position;
  attack: number;
  defence: number;
};

export type TeamOption = {
  teamA: number[];
  teamB: number[];
  totalA: number;
  totalB: number;
  /** |totalA - totalB| */
  diff: number;
  /** lower is better; diff plus penalties */
  cost: number;
};

export type BalanceOptions = {
  /** last match's teams (playerId -> team), to avoid repeating the same split */
  previous?: Map<number, "A" | "B">;
  /** number of different options to return */
  count?: number;
};

// Penalty weights, in "rating points".
const W_POS = 0.6; // defenders / attackers piled on one side
const W_ATTR = 0.1; // attack vs defence attribute totals
const W_REPEAT = 1; // same teams as last time

const MAX_EXACT = 1_500_000;

/**
 * Splits players into two teams of equal size (or ±1) with total strength as
 * close as possible. Small groups (up to ~24) are solved exactly by checking
 * every split; bigger groups use randomised local search.
 */
export function balanceTeams(players: BalancePlayer[], opts: BalanceOptions = {}): TeamOption[] {
  const n = players.length;
  if (n < 2) return [];
  const count = opts.count ?? 3;
  const ctx = makeContext(players, opts.previous);
  const k = Math.floor(n / 2); // team A size (the smaller one if odd)

  const candidates =
    n <= 30 && combinations(n - (n % 2 === 0 ? 1 : 0), n % 2 === 0 ? k - 1 : k) <= MAX_EXACT
      ? exact(ctx, n, k)
      : heuristic(ctx, n, k);

  return pickDiverse(candidates, count, n).map((c) => toOption(ctx, players, c.mask));
}

type Ctx = ReturnType<typeof makeContext>;

function makeContext(players: BalancePlayer[], previous?: Map<number, "A" | "B">) {
  const prev = players.map((p) => previous?.get(p.id));
  const prevCount = prev.filter(Boolean).length;
  return {
    s: players.map((p) => p.strength),
    att: players.map((p) => p.attack),
    def: players.map((p) => p.defence),
    defPos: players.map((p) => (p.position === "DEF" ? 1 : 0)),
    attPos: players.map((p) => (p.position === "ATT" ? 1 : 0)),
    prev,
    prevCount,
    totals: {
      s: sum(players.map((p) => p.strength)),
      att: sum(players.map((p) => p.attack)),
      def: sum(players.map((p) => p.defence)),
      defPos: sum(players.map((p) => (p.position === "DEF" ? 1 : 0))),
      attPos: sum(players.map((p) => (p.position === "ATT" ? 1 : 0))),
    },
  };
}

/** Cost of a split where bit i of `mask` set = player i in team A. */
function cost(ctx: Ctx, mask: number, n: number): number {
  let sA = 0, attA = 0, defA = 0, dpA = 0, apA = 0, sameAsPrev = 0;
  for (let i = 0; i < n; i++) {
    if (mask & (1 << i)) {
      sA += ctx.s[i];
      attA += ctx.att[i];
      defA += ctx.def[i];
      dpA += ctx.defPos[i];
      apA += ctx.attPos[i];
      if (ctx.prev[i] === "A") sameAsPrev++;
    } else if (ctx.prev[i] === "B") sameAsPrev++;
  }
  const t = ctx.totals;
  const spread = (a: number, total: number) => Math.abs(2 * a - total) - (total % 2); // 0 when as even as possible
  let c = Math.abs(2 * sA - t.s);
  c += W_POS * (spread(dpA, t.defPos) + spread(apA, t.attPos));
  c += W_ATTR * (Math.abs(2 * attA - t.att) + Math.abs(2 * defA - t.def));
  if (ctx.prevCount >= 4) {
    // 0.5 = fully reshuffled, 1 = identical (either orientation)
    const overlap = Math.max(sameAsPrev, ctx.prevCount - sameAsPrev) / ctx.prevCount;
    c += W_REPEAT * Math.max(0, overlap - 0.5) * 2;
  }
  return c;
}

type Cand = { mask: number; cost: number };

function exact(ctx: Ctx, n: number, k: number): Cand[] {
  const top = new TopN(200);
  if (n % 2 === 0) {
    // Fix player 0 in team A so mirror-image splits aren't counted twice.
    forEachCombination(n - 1, k - 1, (m) => {
      const mask = (m << 1) | 1;
      top.push(mask, cost(ctx, mask, n));
    });
  } else {
    forEachCombination(n, k, (mask) => top.push(mask, cost(ctx, mask, n)));
  }
  return top.sorted();
}

function heuristic(ctx: Ctx, n: number, k: number): Cand[] {
  // Note: masks limited to 31 players; plenty for a 2-team kickabout.
  if (n > 31) throw new Error("Too many players (max 31)");
  const top = new TopN(200);
  for (let restart = 0; restart < 300; restart++) {
    const idx = shuffle([...Array(n).keys()]);
    let mask = 0;
    for (let i = 0; i < k; i++) mask |= 1 << idx[i];
    let best = cost(ctx, mask, n);
    let improved = true;
    while (improved) {
      improved = false;
      for (let a = 0; a < n && !improved; a++) {
        if (!(mask & (1 << a))) continue;
        for (let b = 0; b < n; b++) {
          if (mask & (1 << b)) continue;
          const m2 = (mask & ~(1 << a)) | (1 << b);
          const c2 = cost(ctx, m2, n);
          if (c2 < best - 1e-9) {
            mask = m2;
            best = c2;
            improved = true;
            break;
          }
        }
      }
    }
    top.push(normalise(mask, n), best);
  }
  return top.sorted();
}

function normalise(mask: number, n: number) {
  // For even n, keep player 0 in team A so duplicates collapse.
  if (n % 2 === 0 && !(mask & 1)) return ~mask & ((1 << n) - 1);
  return mask;
}

/** Best option first, then the next best that differ by at least 2 swaps. */
function pickDiverse(cands: Cand[], count: number, n: number): Cand[] {
  const seen = new Set<number>();
  const unique = cands.filter((c) => !seen.has(c.mask) && seen.add(c.mask));
  const chosen: Cand[] = [];
  const minDiff = n >= 8 ? 4 : 2;
  for (const c of unique) {
    if (chosen.length >= count) break;
    if (chosen.every((o) => moved(o.mask, c.mask, n) >= minDiff)) chosen.push(c);
  }
  for (const c of unique) {
    if (chosen.length >= count) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  return chosen;
}

/** Players on a different side between two splits (ignoring mirror image). */
function moved(a: number, b: number, n: number) {
  const x = popcount(a ^ b);
  return Math.min(x, n - x);
}

function toOption(ctx: Ctx, players: BalancePlayer[], mask: number): TeamOption {
  const teamA: number[] = [];
  const teamB: number[] = [];
  let totalA = 0, totalB = 0;
  players.forEach((p, i) => {
    if (mask & (1 << i)) {
      teamA.push(p.id);
      totalA += p.strength;
    } else {
      teamB.push(p.id);
      totalB += p.strength;
    }
  });
  return {
    teamA,
    teamB,
    totalA: r1(totalA),
    totalB: r1(totalB),
    diff: r1(Math.abs(totalA - totalB)),
    cost: Math.round(cost(ctx, mask, players.length) * 100) / 100,
  };
}

/** Totals for a hand-edited split (used by the UI when you swap players). */
export function teamTotals(players: BalancePlayer[], teamA: number[]) {
  const a = new Set(teamA);
  let totalA = 0, totalB = 0;
  for (const p of players) {
    if (a.has(p.id)) totalA += p.strength;
    else totalB += p.strength;
  }
  return { totalA: r1(totalA), totalB: r1(totalB), diff: r1(Math.abs(totalA - totalB)) };
}

// ---------- helpers ----------

function forEachCombination(n: number, k: number, fn: (mask: number) => void) {
  if (k === 0) return fn(0);
  if (k > n) return;
  // Gosper's hack
  let m = (1 << k) - 1;
  const limit = 1 << n;
  while (m < limit) {
    fn(m);
    const c = m & -m;
    const r = m + c;
    m = (((r ^ m) >>> 2) / c) | r;
  }
}

function combinations(n: number, k: number) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

class TopN {
  private items: Cand[] = [];
  constructor(private n: number) {}
  push(mask: number, cost: number) {
    if (this.items.length >= this.n && cost >= this.items[this.items.length - 1].cost) return;
    let i = this.items.length;
    while (i > 0 && this.items[i - 1].cost > cost) i--;
    this.items.splice(i, 0, { mask, cost });
    if (this.items.length > this.n) this.items.pop();
  }
  sorted() {
    return this.items;
  }
}

function popcount(x: number) {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const r1 = (n: number) => Math.round(n * 10) / 10;
