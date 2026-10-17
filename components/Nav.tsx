"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ink = "#1f2933";
const accent = "#2b3a67";

const icon = (d: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const tabs = [
  { href: "/home", label: "Home", icon: icon(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>) },
  { href: "/journal", label: "Journal", icon: icon(<><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" /><path d="M9 9h6M9 13h6" /></>) },
  { href: "/coach", label: "Coach", icon: icon(<path d="M4 5h16v11H9l-5 4V5z" />) },
  { href: "/dashboard", label: "Pillars", icon: icon(<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />) },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 640,
          margin: "0 auto",
          padding: "16px 20px 0",
          color: ink,
        }}
      >
        <span style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Thrivar</span>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            style={{ background: "none", border: "none", color: ink, opacity: 0.6, cursor: "pointer", fontSize: 14 }}
          >
            Log out
          </button>
        </form>
      </header>

      <nav
        aria-label="Main"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: "#faf6ef",
          borderTop: `1px solid ${ink}1f`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div style={{ display: "flex", maxWidth: 640, margin: "0 auto" }}>
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "10px 0 12px",
                  textDecoration: "none",
                  fontSize: 12,
                  color: active ? accent : `${ink}8c`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {t.icon}
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
