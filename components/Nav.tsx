"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/week", label: "Weekly Assessment" },
  { href: "/coach", label: "Coach" },
  { href: "/journal", label: "Journal" },
  { href: "/dashboard", label: "Pillars" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-midnight";

export default function Nav() {
  const pathname = usePathname();
  // Home is the wider, two-column page; every other page keeps the narrow reading width.
  const onHome = pathname === "/home";
  const width = onHome ? "max-w-[1040px]" : "max-w-[640px]";
  return (
    <nav
      aria-label="Main"
      className={`mx-auto flex w-full ${width} flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-5 text-midnight`}
    >
      <Link href="/" className={`mr-auto font-display text-xl tracking-[0.18em] text-midnight ${focusRing}`}>
        THRIVAR
      </Link>

      {/* On Home the four entry points sit lower on the page, so the top bar stays quiet. */}
      {!onHome && links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 pb-0.5 text-sm transition-colors ${focusRing} ${
              active ? "border-midnight text-midnight" : "border-transparent text-mineral-deep hover:text-midnight"
            }`}
          >
            {l.label}
          </Link>
        );
      })}

      <form action="/api/logout" method="post">
        <button
          type="submit"
          className={`text-sm text-mineral-deep transition-colors hover:text-midnight ${focusRing}`}
        >
          Log out
        </button>
      </form>
    </nav>
  );
}
