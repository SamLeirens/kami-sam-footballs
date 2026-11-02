import Link from "next/link";
import { Suspense } from "react";
import { ActiveNavLinks, NavLinks } from "./NavLinks";

export function Nav() {
  return (
    <header className="sticky top-0 z-10 bg-pitch-800 text-white shadow">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 sm:gap-4">
        <Link href="/" className="shrink-0 text-lg font-bold">
          ⚽<span className="hidden sm:inline"> Kami Football</span>
        </Link>
        <Suspense fallback={<NavLinks path={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </div>
    </header>
  );
}
