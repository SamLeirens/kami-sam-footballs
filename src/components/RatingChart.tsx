"use client";

import { useEffect, useRef, useState } from "react";

export type RatingPoint = { date: string; value: number }; // date = YYYY-MM-DD

const H = 180;
const PAD = { top: 16, right: 40, bottom: 26, left: 28 };

const fmt = (d: string, year = false) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });

/**
 * Rating over time as a step line (a rating only changes when you edit it).
 * Hover/touch snaps a crosshair to the nearest change; the list below is the table view.
 */
export function RatingChart({ points, today }: { points: RatingPoint[]; today: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(300); // real width is measured on mount
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) return <p className="text-sm text-muted">No rating history yet.</p>;

  const t = (d: string) => new Date(d + "T00:00:00Z").getTime();
  const end = points.at(-1)!.date > today ? points.at(-1)!.date : today;
  const x0 = t(points[0].date);
  const x1 = Math.max(t(end), x0 + 86_400_000 * 7); // at least a week wide
  const vals = points.map((p) => p.value);
  const lo = Math.max(1, Math.floor(Math.min(...vals)) - 1);
  const hi = Math.min(10, Math.ceil(Math.max(...vals)) + 1);
  const innerW = w - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const X = (d: string) => PAD.left + ((t(d) - x0) / (x1 - x0)) * innerW;
  const Y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;

  // step-after path, extended flat to today
  let d = `M${X(points[0].date)},${Y(points[0].value)}`;
  for (let i = 1; i < points.length; i++) d += `H${X(points[i].date)}V${Y(points[i].value)}`;
  d += `H${X(end)}`;

  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => (hi - lo > 6 ? v % 2 === 0 : true));
  const last = points.at(-1)!;
  const h = hover !== null ? points[hover] : null;

  function onMove(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(X(p.date) - px) < Math.abs(X(points[best].date) - px)) best = i;
    });
    setHover(best);
  }

  return (
    <div className="min-w-0">
      <div
        ref={box}
        className="relative w-full min-w-0 touch-pan-y overflow-hidden select-none"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={w} height={H} role="img" aria-label={`Rating over time, from ${points[0].value} to ${last.value}`} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={w - PAD.right} y1={Y(v)} y2={Y(v)} stroke="var(--color-line-soft)" strokeWidth={1} />
              <text x={PAD.left - 8} y={Y(v)} dy="0.35em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {v}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 6} className="fill-muted text-[11px]">{fmt(points[0].date, true)}</text>
          <text x={w - PAD.right} y={H - 6} textAnchor="end" className="fill-muted text-[11px]">Today</text>

          <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={X(p.date)}
              cy={Y(p.value)}
              r={hover === i ? 6 : 4}
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}
          {/* direct label at the end of the line */}
          <text x={X(end) + 6} y={Y(last.value)} dy="0.35em" className="fill-fg text-[13px] font-semibold tabular-nums">
            {last.value.toFixed(1)}
          </text>

          {h && (
            <line x1={X(h.date)} x2={X(h.date)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-subtle)" strokeWidth={1} />
          )}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(X(h.date) - 50, 0), w - 110) }}
          >
            <div className="text-muted">{fmt(h.date, true)}</div>
            <div className="font-semibold text-fg tabular-nums">Rating {h.value.toFixed(1)}</div>
          </div>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted hover:text-fg">Show as list</summary>
        <ul className="mt-1 divide-y divide-line-soft">
          {[...points].reverse().map((p, i) => (
            <li key={i} className="flex justify-between py-1.5">
              <span className="text-muted">{fmt(p.date, true)}</span>
              <span className="font-semibold tabular-nums">{p.value.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
