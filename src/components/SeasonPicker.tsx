import Link from "next/link";
import type { SeasonRange } from "@/lib/seasons";

/** Season chips as links. `href` builds the URL for a `season` param value. */
export function SeasonPicker({
  seasons,
  selected,
  href,
}: {
  seasons: SeasonRange[];
  selected: SeasonRange | null;
  href: (season: string) => string;
}) {
  if (seasons.length === 0) return null;
  const chips = [...[...seasons].reverse().map((s) => ({ key: String(s.id), label: s.name })), { key: "all", label: "All-time" }];
  const active = selected ? String(selected.id) : "all";
  return (
    <nav aria-label="Season" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={href(c.key)}
          aria-current={c.key === active ? "page" : undefined}
          className={`flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold ${
            c.key === active ? "bg-fg text-ground" : "border border-line text-soft hover:text-fg"
          }`}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}
