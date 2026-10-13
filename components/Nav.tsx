"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/coach", label: "Coach" },
  { href: "/journal", label: "Journal" },
  { href: "/dashboard", label: "Pillars" },
];

const ink = "#1f2933";

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        maxWidth: 640,
        margin: "0 auto",
        padding: "16px 20px 0",
        color: ink,
      }}
    >
      <span style={{ fontFamily: "Georgia, serif", fontSize: 20, marginRight: "auto" }}>
        Thrivar
      </span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          style={{
            color: ink,
            textDecoration: "none",
            paddingBottom: 2,
            borderBottom: pathname === l.href ? `2px solid ${ink}` : "2px solid transparent",
          }}
        >
          {l.label}
        </Link>
      ))}
      <form action="/api/logout" method="post">
        <button
          type="submit"
          style={{ background: "none", border: "none", color: ink, opacity: 0.7, cursor: "pointer", fontSize: 16 }}
        >
          Log out
        </button>
      </form>
    </nav>
  );
}
