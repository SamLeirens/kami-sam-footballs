import type { Position } from "@/lib/positions";
import type { Result } from "@/lib/stats";

const POS_STYLE: Record<Position, string> = {
  GK: "bg-warn-dim text-warn",
  DEF: "bg-surface-2 text-soft",
  MID: "bg-surface-2 text-muted",
  ATT: "bg-danger-dim text-danger",
};

export function PosBadge({ position }: { position: Position }) {
  return (
    <span className={`inline-block w-9 shrink-0 rounded-md py-0.5 text-center text-[10px] font-bold tracking-wide ${POS_STYLE[position]}`}>
      {position}
    </span>
  );
}

const RESULT_STYLE: Record<Result, string> = {
  W: "bg-accent text-ground",
  D: "bg-subtle text-ground",
  L: "bg-danger text-ground",
};

/** Letter chip, for match lists. */
export function ResultChip({ r }: { r: Result }) {
  return (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${RESULT_STYLE[r]}`}>
      {r}
    </span>
  );
}

const DOT_STYLE: Record<Result, string> = { W: "bg-accent", D: "bg-subtle", L: "bg-danger" };

/** Last results as small squares, most recent first. */
export function Form({ form }: { form: Result[] }) {
  if (!form.length) return <span className="text-subtle">–</span>;
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Form: ${form.join(" ")}`} title={form.join(" ")}>
      {form.map((r, i) => (
        <span key={i} className={`h-2 w-2 rounded-[2px] ${DOT_STYLE[r]}`} />
      ))}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="num text-4xl leading-none">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function formatDate(d: string, opts: { short?: boolean } = {}) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(opts.short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
