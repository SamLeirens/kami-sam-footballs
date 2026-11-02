"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches/new", label: "Pick teams" },
  { href: "/matches", label: "Matches" },
  { href: "/players", label: "Players" },
  { href: "/stats", label: "Stats" },
  { href: "/settings", label: "Settings" },
];

function isActive(href: string, path: string | null) {
  if (!path) return false;
  if (href === "/") return path === "/";
  if (href === "/matches" && path === "/matches/new") return false;
  return path === href || path.startsWith(href + "/");
}

export function ActiveNavLinks() {
  return <NavLinks path={usePathname()} />;
}

export function NavLinks({ path }: { path: string | null }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 ${
            isActive(l.href, path) ? "bg-white/20 font-semibold" : "text-white/80 hover:bg-white/10"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
