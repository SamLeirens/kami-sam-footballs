"use client";

import Link from "next/link";
import { useState } from "react";
import type { Result } from "@/lib/stats";
import { Form } from "./ui";

export type LeaderRow = { id: number; name: string; value: string; form: Result[] };
export type LeaderBoard = { key: string; label: string; rows: LeaderRow[]; empty: string };

export function LeaderTabs({ boards, caption }: { boards: LeaderBoard[]; caption?: string }) {
  const [active, setActive] = useState(boards[0]?.key);
  const board = boards.find((b) => b.key === active) ?? boards[0];
  return (
    <section className="card pt-3.5 pb-2">
      {caption && <div className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">{caption}</div>}
      <div role="tablist" aria-label="Leaderboards" className="mb-1.5 flex gap-1.5">
        {boards.map((b) => (
          <button
            key={b.key}
            role="tab"
            aria-selected={b.key === board.key}
            onClick={() => setActive(b.key)}
            className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold ${
              b.key === board.key ? "bg-fg text-ground" : "border border-line text-soft hover:text-fg"
            }`}
          >
            {b.label}
          </button>
        ))}
        <Link href="/stats" className="ml-auto self-center text-[13px] font-semibold text-accent">
          All
        </Link>
      </div>
      {board.rows.length === 0 ? (
        <p className="border-t border-line-soft py-4 text-sm text-muted">{board.empty}</p>
      ) : (
        <ol role="tabpanel">
          {board.rows.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3.5 border-t border-line-soft py-2.5">
              <span className="num w-5 text-2xl text-subtle">{i + 1}</span>
              <Link href={`/players/${p.id}`} className="flex-1 truncate text-[15px] font-medium hover:text-accent">
                {p.name}
              </Link>
              <Form form={p.form} />
              <span className="num w-14 text-right text-[22px]">{p.value}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
