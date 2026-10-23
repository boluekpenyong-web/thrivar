"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/week", label: "This week" },
  { href: "/coach", label: "Coach" },
  { href: "/journal", label: "Journal" },
  { href: "/dashboard", label: "Pillars" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum";

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="mx-auto flex w-full max-w-[640px] flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-4 text-ink"
    >
      <Link
        href="/"
        className={`mr-auto font-display text-xl tracking-[0.18em] text-aubergine ${focusRing}`}
      >
        THRIVAR
      </Link>

      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 pb-0.5 text-sm transition-colors ${focusRing} ${
              active
                ? "border-aubergine text-aubergine"
                : "border-transparent text-ink/75 hover:text-aubergine"
            }`}
          >
            {l.label}
          </Link>
        );
      })}

      <form action="/api/logout" method="post">
        <button
          type="submit"
          className={`text-sm text-ink/70 transition-colors hover:text-aubergine ${focusRing}`}
        >
          Log out
        </button>
      </form>
    </nav>
  );
}
