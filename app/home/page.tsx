import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";
import GenerateMapButton from "@/components/GenerateMapButton";
import TransformationVisual from "@/components/TransformationVisual";

const primaryButton =
  "inline-block rounded-lg bg-aubergine px-6 py-3 text-sm text-cream transition-colors hover:bg-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";
const secondaryButton =
  "inline-block rounded-lg border border-aubergine/30 px-6 py-3 text-sm text-aubergine transition-colors hover:bg-greige focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";

// Saved maps come back from the database with their keys in arbitrary order,
// so the text sections are listed explicitly.
const TEXT_SECTIONS = ["whereYouAre", "primaryStrain", "strongestFoundation", "secondaryTension"];

const label = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Latest two assessments: the newest drives the page, the one before it is
  // shown as a dashed outline on the visual map.
  const { data: rows } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(2);

  const profile = rows?.[0] ?? null;
  const previousProfile = rows?.[1] ?? null;

  // New here? Start with the assessment.
  if (!profile) redirect("/assessment");

  const scores = (profile.pillar_scores ?? null) as Record<string, number> | null;
  const states = (profile.pillar_states ?? null) as Record<string, string> | null;
  const previousScores = (previousProfile?.pillar_scores ?? null) as Record<string, number> | null;
  const map = (profile.transformation_map ?? null) as Record<string, unknown> | null;

  const textEntries = map
    ? TEXT_SECTIONS.filter((k) => typeof map[k] === "string" && (map[k] as string).trim() !== "").map(
        (k) => [k, map[k] as string] as const
      )
    : [];

  const cycleFocus = (map?.cycleFocus ?? null) as { stage?: string; why?: string } | null;
  const strengths = stringList(map?.strengths);
  const nextSteps = stringList(map?.nextSteps);
  const priorities = (Array.isArray(map?.priorities) ? (map!.priorities as unknown[]) : [])
    .map((p) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return {
        dimension: typeof o.dimension === "string" ? o.dimension : "",
        why: typeof o.why === "string" ? o.why : "",
      };
    })
    .filter((p) => p.dimension && p.why);

  const dimensions = scores
    ? PILLARS.map((p) => ({
        key: p.key as string,
        label: p.label as string,
        score: typeof scores[p.key] === "number" ? scores[p.key] : 0,
        state: states?.[p.key] ?? "",
      }))
    : [];

  const hasMap = textEntries.length > 0;

  return (
    <main className="mx-auto max-w-[640px] px-5 py-12 text-ink">
      <h1 className="font-display text-4xl text-aubergine">Welcome back</h1>
      <p className="mt-2 text-ink/75">Here is where you are and what to do next.</p>

      <div className="mb-10 mt-6 flex flex-wrap gap-3">
        <Link href="/coach" className={primaryButton}>
          Talk to your coach
        </Link>
        <Link href="/week" className={secondaryButton}>
          This week
        </Link>
        <Link href="/journal" className={secondaryButton}>
          Journal
        </Link>
        <Link href="/dashboard" className={secondaryButton}>
          See your pillars
        </Link>
      </div>

      {dimensions.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-1 font-display text-2xl text-aubergine">Where you are right now</h2>
          <p className="mb-5 text-sm leading-relaxed text-ink/75">
            A picture of your six dimensions from your latest answers. Tap any one to read what it is showing.
          </p>
          <TransformationVisual dimensions={dimensions} priorities={priorities} previous={previousScores} />
        </section>
      )}

      {hasMap && (
        <section>
          <h2 className="mb-2 font-display text-2xl text-aubergine">Your Transformation Map</h2>

          {textEntries.map(([k, v]) => (
            <div key={k} className="my-5 border-l-2 border-champagne pl-4">
              <strong className="font-medium text-aubergine">{label(k)}</strong>
              <p className="mt-1 leading-relaxed">{v}</p>
            </div>
          ))}

          {cycleFocus?.why && (
            <div className="my-5 border-l-2 border-champagne pl-4">
              <strong className="font-medium text-aubergine">
                Your current focus{cycleFocus.stage ? `: ${capitalise(cycleFocus.stage)}` : ""}
              </strong>
              <p className="mt-1 leading-relaxed">{cycleFocus.why}</p>
            </div>
          )}

          {strengths.length > 0 && (
            <div className="my-5 border-l-2 border-champagne pl-4">
              <strong className="font-medium text-aubergine">Strengths to build on</strong>
              <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {nextSteps.length > 0 && (
            <div className="my-5 rounded-lg border-2 border-aubergine p-5">
              <strong className="font-medium text-aubergine">Next steps for this week</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                {nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {!hasMap && <GenerateMapButton profileId={profile.id} />}

      {dimensions.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-aubergine underline underline-offset-4">
            See all six scores
          </summary>
          <div className="mt-3">
            {dimensions.map((d) => (
              <div key={d.key} className="flex justify-between border-b border-champagne/60 py-3">
                <span>
                  {d.label}
                  <span className="text-plum"> · {d.state}</span>
                </span>
                <span>{d.score}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="mt-10">
        <Link
          href="/assessment"
          className="text-sm text-ink/70 underline underline-offset-4 hover:text-aubergine"
        >
          Retake the assessment
        </Link>
      </p>
    </main>
  );
}
