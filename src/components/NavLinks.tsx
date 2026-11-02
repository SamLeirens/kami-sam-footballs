"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/matches/new", label: "Teams", icon: "teams" },
  { href: "/matches", label: "Matches", icon: "calendar" },
  { href: "/players", label: "Players", icon: "player" },
  { href: "/stats", label: "Stats", icon: "stats" },
];

function isActive(href: string, path: string | null) {
  if (!path) return false;
  if (href === "/") return path === "/";
  if (href === "/matches" && path === "/matches/new") return false;
  return path === href || path.startsWith(href + "/");
}

type Variant = "top" | "bottom";

export function ActiveNavLinks({ variant }: { variant: Variant }) {
  return <NavLinks path={usePathname()} variant={variant} />;
}

export function NavLinks({ path, variant }: { path: string | null; variant: Variant }) {
  if (variant === "top") {
    return (
      <nav aria-label="Main" className="flex gap-1 text-sm font-semibold">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-3.5 py-2 ${isActive(l.href, path) ? "bg-surface text-accent" : "text-muted hover:text-fg"}`}
          >
            {l.href === "/matches/new" ? "Pick teams" : l.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="Main" className="grid grid-cols-5 px-2 pt-2 pb-2">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${
            isActive(l.href, path) ? "bg-surface text-accent" : "text-muted"
          }`}
        >
          <Icon name={l.icon} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
