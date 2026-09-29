import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";

const ink = "#1f2933";
const navy = "#2b3a67";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const scores = (profile?.pillar_scores ?? null) as Record<string, number> | null;
  const states = (profile?.pillar_states ?? null) as Record<string, string> | null;
  const map = (profile?.transformation_map ?? null) as Record<string, unknown> | null;
  const mapEntries = map
    ? Object.entries(map).filter(([, v]) => typeof v === "string")
    : [];

  const label = (k: string) =>
    k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  const button = (primary: boolean) => ({
    display: "inline-block",
    padding: "12px 22px",
    borderRadius: 999,
    textDecoration: "none",
    background: primary ? navy : "transparent",
    color: primary ? "#fff" : ink,
    border: primary ? "none" : `1px solid ${ink}55`,
  });

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px", color: ink }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, margin: 0 }}>
        Welcome back
      </h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        {profile
          ? "Here is where you are and what to do next."
          : "Take the assessment to see where you are."}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "24px 0 40px" }}>
        {profile ? (
          <>
            <Link href="/coach" style={button(true)}>Talk to your coach</Link>
            <Link href="/dashboard" style={button(false)}>See your pillars</Link>
          </>
        ) : (
          <Link href="/assessment" style={button(true)}>Start the assessment</Link>
        )}
      </div>

      {scores && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Your six pillars</h2>
          {PILLARS.map((p) => (
            <div
              key={p.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: `1px solid ${ink}22`,
              }}
            >
              <span>
                {p.label}
                <span style={{ opacity: 0.6 }}> · {states?.[p.key] ?? ""}</span>
              </span>
              <span>{scores[p.key] ?? "-"}</span>
            </div>
          ))}
        </section>
      )}

      {mapEntries.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Your Transformation Map</h2>
          {mapEntries.map(([k, v]) => (
            <div key={k} style={{ margin: "18px 0" }}>
              <strong>{label(k)}</strong>
              <p style={{ margin: "4px 0 0", lineHeight: 1.6 }}>{v as string}</p>
            </div>
          ))}
        </section>
      )}

      {profile && mapEntries.length === 0 && (
        <p style={{ opacity: 0.75 }}>
          Your map has not been generated yet. Finish the assessment to create it.
        </p>
      )}
    </main>
  );
}
