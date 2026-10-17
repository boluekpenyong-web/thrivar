import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";
import { CYCLE } from "@/lib/thrivar/cycle";
import GenerateMapButton from "@/components/GenerateMapButton";
import MapRadar from "@/components/MapRadar";

const ink = "#1f2933";
const accent = "#2b3a67";

type Priority = { dimension: string; why: string };
type TMap = {
  whereYouAre?: string;
  strongestFoundation?: string;
  primaryStrain?: string;
  secondaryTension?: string | null;
  cycleFocus?: { stage?: string; why?: string };
  strengths?: string[];
  priorities?: Priority[];
  nextSteps?: string[];
};

const h2 = { fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 8px" } as const;
const section = { margin: "36px 0" } as const;
const body = { lineHeight: 1.65, margin: "6px 0" } as const;

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1);
  const profile = profiles?.[0] ?? null;

  // New here? Start with the assessment.
  if (!profile) redirect("/assessment");

  const scores = (profile.pillar_scores ?? {}) as Record<string, number>;
  const states = (profile.pillar_states ?? {}) as Record<string, string>;
  const map = (profile.transformation_map ?? null) as TMap | null;
  const hasMap = !!(map && map.whereYouAre);

  // Earliest snapshot, so the map can later show change over time.
  const { data: firstSnap } = await supabase
    .from("map_snapshots")
    .select("pillar_scores")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const initialScores = (firstSnap?.[0]?.pillar_scores ?? null) as Record<string, number> | null;
  const changed =
    initialScores && JSON.stringify(initialScores) !== JSON.stringify(scores) ? initialScores : null;

  const labelOf = (key: string) => PILLARS.find((p) => p.key === key)?.label ?? key;
  const stage = CYCLE.find((c) => c.key === map?.cycleFocus?.stage);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 40px", color: ink }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, margin: 0 }}>Your landscape</h1>
      <p style={{ ...body, opacity: 0.75 }}>
        See where you are. Understand what&apos;s shaping you. Build where you&apos;re going.
      </p>

      <section style={section}>
        <MapRadar scores={scores} states={states} previousScores={changed} />
      </section>

      {!hasMap && <GenerateMapButton profileId={profile.id} />}

      {hasMap && map && (
        <>
          <section style={section}>
            <h2 style={h2}>Where you are</h2>
            <p style={body}>{map.whereYouAre}</p>
          </section>

          <section style={section}>
            <h2 style={h2}>What&apos;s shaping you</h2>
            {map.primaryStrain && <p style={body}>{map.primaryStrain}</p>}
            {map.secondaryTension && <p style={body}>{map.secondaryTension}</p>}
          </section>

          {(map.strongestFoundation || (map.strengths && map.strengths.length > 0)) && (
            <section style={section}>
              <h2 style={h2}>What you can build on</h2>
              {map.strongestFoundation && <p style={body}>{map.strongestFoundation}</p>}
              {map.strengths && map.strengths.length > 0 && (
                <ul style={{ ...body, paddingLeft: 20 }}>
                  {map.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {stage && (
            <section style={section}>
              <h2 style={h2}>Your current focus</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 12px" }}>
                {CYCLE.map((c) => (
                  <span
                    key={c.key}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 14,
                      background: c.key === stage.key ? accent : "transparent",
                      color: c.key === stage.key ? "#fff" : ink,
                      border: c.key === stage.key ? "none" : `1px solid ${ink}33`,
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <p style={body}>
                <strong>{stage.label}:</strong> {stage.blurb}
              </p>
              {map.cycleFocus?.why && <p style={body}>{map.cycleFocus.why}</p>}
              <p style={{ ...body, fontSize: 14, opacity: 0.65 }}>
                The cycle repeats. You can come back to any stage as life changes.
              </p>
            </section>
          )}

          {map.priorities && map.priorities.length > 0 && (
            <section style={section}>
              <h2 style={h2}>Where attention may help</h2>
              {map.priorities.map((p, i) => (
                <div key={i} style={{ margin: "14px 0" }}>
                  <strong>{labelOf(p.dimension)}</strong>
                  <p style={{ ...body, margin: "2px 0 0" }}>{p.why}</p>
                </div>
              ))}
            </section>
          )}

          {map.nextSteps && map.nextSteps.length > 0 && (
            <section style={section}>
              <h2 style={h2}>Your next steps</h2>
              <ol style={{ ...body, paddingLeft: 20 }}>
                {map.nextSteps.map((s, i) => (
                  <li key={i} style={{ margin: "8px 0" }}>
                    {s}
                  </li>
                ))}
              </ol>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                <Link
                  href="/journal"
                  style={{ padding: "12px 22px", borderRadius: 999, background: accent, color: "#fff", textDecoration: "none" }}
                >
                  Write in your journal
                </Link>
                <Link
                  href="/coach"
                  style={{ padding: "12px 22px", borderRadius: 999, border: `1px solid ${ink}55`, color: ink, textDecoration: "none" }}
                >
                  Talk to your coach
                </Link>
              </div>
            </section>
          )}
        </>
      )}

      <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.6, marginTop: 40 }}>
        This map is a reflective tool built from your own answers. It is not a diagnosis or a judgment of who you are,
        and it can change as you do.{" "}
        <Link href="/assessment" style={{ color: ink }}>
          Retake the assessment
        </Link>
      </p>
    </main>
  );
}
