import type { Position } from "@/lib/positions";
import type { Result } from "@/lib/stats";

const POS_STYLE: Record<Position, string> = {
  GK: "bg-amber-100 text-amber-800",
  DEF: "bg-sky-100 text-sky-800",
  MID: "bg-emerald-100 text-emerald-800",
  ATT: "bg-rose-100 text-rose-800",
};

export function PosBadge({ position }: { position: Position }) {
  return (
    <span className={`inline-block w-9 rounded px-1 py-0.5 text-center text-[10px] font-bold ${POS_STYLE[position]}`}>
      {position}
    </span>
  );
}

const RESULT_STYLE: Record<Result, string> = {
  W: "bg-pitch-600 text-white",
  D: "bg-neutral-400 text-white",
  L: "bg-red-500 text-white",
};

export function ResultChip({ r }: { r: Result }) {
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${RESULT_STYLE[r]}`}>
      {r}
    </span>
  );
}

export function Form({ form }: { form: Result[] }) {
  if (!form.length) return <span className="text-neutral-400">–</span>;
  return (
    <span className="inline-flex gap-0.5">
      {form.map((r, i) => (
        <ResultChip key={i} r={r} />
      ))}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export function formatDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
