import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "./icons";
import { ActiveNavLinks, NavLinks } from "./NavLinks";

export function Nav() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line-soft bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-2.5">
          <Link href="/" className="font-display text-2xl leading-none font-extrabold tracking-wider">
            KAMI FC
          </Link>
          <div className="hidden flex-1 md:block">
            <Suspense fallback={<NavLinks path={null} variant="top" />}>
              <ActiveNavLinks variant="top" />
            </Suspense>
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-fg hover:bg-surface-2 md:ml-0"
          >
            <Icon name="settings" size={20} />
          </Link>
        </div>
      </header>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-soft bg-ground/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <Suspense fallback={<NavLinks path={null} variant="bottom" />}>
          <ActiveNavLinks variant="bottom" />
        </Suspense>
      </div>
    </>
  );
}
