"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Top of the page: only the wordmark and Log out.
// Bottom of the page: the four ways to work (plus Home), on every page except Home itself,
// where the same four entry points already sit lower on the page.
const links = [
  { href: "/home", label: "Home", short: "Home" },
  { href: "/week", label: "Weekly Assessment", short: "Assessment" },
  { href: "/coach", label: "Coach", short: "Coach" },
  { href: "/journal", label: "Journal", short: "Journal" },
  { href: "/dashboard", label: "Pillars", short: "Pillars" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-midnight";

export default function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/home";
  const width = onHome ? "max-w-[1040px]" : "max-w-[640px]";

  return (
    <>
      <header className={`mx-auto flex w-full ${width} items-center justify-between px-5 pt-5 text-midnight`}>
        <Link href="/" className={`font-display text-xl tracking-[0.18em] text-midnight ${focusRing}`}>
          THRIVAR
        </Link>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className={`text-sm text-mineral-deep transition-colors hover:text-midnight ${focusRing}`}
          >
            Log out
          </button>
        </form>
      </header>

      {!onHome && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 h-14 border-t border-midnight/15 bg-ivory"
        >
          <ul className="mx-auto flex h-full max-w-[760px]">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href} className="flex-1">
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-full items-center justify-center border-t-[3px] px-1 text-center text-xs transition-colors sm:text-sm ${focusRing} ${
                      active
                        ? "border-champagne font-medium text-midnight"
                        : "border-transparent text-mineral-deep hover:text-midnight"
                    }`}
                  >
                    <span className="sm:hidden">{l.short}</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
