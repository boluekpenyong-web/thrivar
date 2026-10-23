import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";
import GenerateMapButton from "@/components/GenerateMapButton";
import TransformationVisual from "@/components/TransformationVisual";
import IntelligenceCard from "@/components/IntelligenceCard";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight";
const primaryButton = `inline-block rounded-md bg-midnight px-5 py-2.5 text-sm text-ivory transition-colors hover:bg-plum ${focusRing}`;
const label = "text-xs uppercase tracking-[0.14em] text-mineral-deep";

const TEXT_SECTIONS = ["whereYouAre", "primaryStrain", "strongestFoundation", "secondaryTension"];
const sectionLabel = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

const FEATURES = [
  { href: "/week", title: "Weekly Assessment", body: "Review your week and set the next one." },
  { href: "/coach", title: "Coach", body: "Think through a decision or a change." },
  { href: "/journal", title: "Journal", body: "Capture what you notice and discover." },
  { href: "/dashboard", title: "Pillars", body: "Your six dimensions in detail." },
];

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Latest two assessments: the newest drives the page, the one before it is
  // shown as a dashed outline on the radar.
  const { data: rows } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(2);

  const profile = rows?.[0] ?? null;
  const previousProfile = rows?.[1] ?? null;
  if (!profile) redirect("/assessment");

  const scores = (profile.pillar_scores ?? null) as Record<string, number> | null;
  const states = (profile.pillar_states ?? null) as Record<string, string> | null;
  const previousScores = (previousProfile?.pillar_scores ?? null) as Record<string, number> | null;
  const map = (profile.transformation_map ?? null) as Record<string, unknown> | null;

  const textEntries = map
    ? TEXT_SECTIONS.filter((k) => str(map[k]) !== "").map((k) => [k, str(map[k])] as const)
    : [];
  const hasMap = textEntries.length > 0;

  const cycleFocus = (map?.cycleFocus ?? null) as { stage?: string; why?: string } | null;
  const strengths = stringList(map?.strengths);
  const nextSteps = stringList(map?.nextSteps);
  const priorities = (Array.isArray(map?.priorities) ? (map!.priorities as unknown[]) : [])
    .map((p) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return { dimension: str(o.dimension), why: str(o.why) };
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

  // This week's steps, to find the next meaningful one. If the table is missing, Home still works.
  const { data: weekRows } = await supabase
    .from("weekly_assignments")
    .select("week_number, title, why, status")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(8);
  const thisWeek = (weekRows ?? []).filter((r) => r.week_number === weekRows?.[0]?.week_number);
  const unfinished = thisWeek.find((r) => r.status !== "completed");

  let next: { title: string; body: string; href: string; cta: string } | null = null;
  if (!hasMap) {
    next = null;
  } else if (thisWeek.length === 0) {
    next = {
      title: nextSteps[0] ?? "Plan your first week",
      body: "Turn your map into a few small steps for this week.",
      href: "/week",
      cta: "Plan my week",
    };
  } else if (unfinished) {
    next = {
      title: String(unfinished.title),
      body: str(unfinished.why) || "A step you set for this week.",
      href: "/week",
      cta: "Open Weekly Assessment",
    };
  } else {
    next = {
      title: "Your steps for this week are done",
      body: "Take a few minutes to review the week and set the next one.",
      href: "/week",
      cta: "Review my week",
    };
  }

  const focusWhy = str(cycleFocus?.why);
  const focusStage = str(cycleFocus?.stage);

  return (
    <main className="mx-auto max-w-[1040px] px-5 pb-20 pt-10 text-midnight sm:pt-14">
      {/* Primary experience: one composition, not separate widgets */}
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-2 lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <h1 className="font-display text-3xl text-midnight sm:text-4xl">Welcome back</h1>

          {hasMap ? (
            <div className="mt-8">
              <p className={label}>Where you are right now</p>
              <p className="mt-2 text-lg leading-relaxed text-midnight">{str(map?.whereYouAre)}</p>

              {focusWhy && (
                <div className="mt-6">
                  <p className={label}>
                    What matters now{focusStage ? ` · ${capitalise(focusStage)}` : ""}
                  </p>
                  <p className="mt-2 leading-relaxed text-midnight/85">{focusWhy}</p>
                </div>
              )}

              <p className="mt-6 text-sm">
                <a href="#map" className="text-midnight underline underline-offset-4">
                  Read your full Transformation Map
                </a>
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <p className="leading-relaxed text-midnight/85">
                Your six dimensions are on the right. Generate your Transformation Map to see where you are, what
                matters now, and your next step.
              </p>
              <div className="mt-5">
                <GenerateMapButton profileId={profile.id} />
              </div>
            </div>
          )}
        </div>

        {dimensions.length > 0 && (
          <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
            <p className={label}>Your six dimensions</p>
            <div className="mt-3">
              <TransformationVisual dimensions={dimensions} priorities={priorities} previous={previousScores} />
            </div>
          </div>
        )}

        {next && (
          <div className="lg:col-start-1 lg:row-start-2">
            <p className={label}>Your next step</p>
            <div className="mt-2 border-t border-midnight/15 pt-4">
              <h2 className="font-display text-xl text-midnight">{next.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-midnight/80">{next.body}</p>
              <div className="mt-4">
                <Link href={next.href} className={primaryButton}>
                  {next.cta}
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-start-1 lg:row-start-3">
          <IntelligenceCard />
        </div>
      </div>

      {/* The full map, for reading and revisiting */}
      {hasMap && (
        <section id="map" className="mt-20 scroll-mt-6 border-t border-midnight/15 pt-10">
          <h2 className="font-display text-2xl text-midnight">Your Transformation Map</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mineral-deep">
            A reflection of where you are right now. It is not a verdict on who you are, and it can change as you do.
          </p>

          <div className="mt-8 grid gap-x-14 gap-y-8 md:grid-cols-2">
            {textEntries.map(([k, v]) => (
              <div key={k}>
                <h3 className="text-sm font-medium text-midnight">{sectionLabel(k)}</h3>
                <p className="mt-1 leading-relaxed text-midnight/85">{v}</p>
              </div>
            ))}

            {strengths.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-midnight">Strengths to build on</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed text-midnight/85">
                  {strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {nextSteps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-midnight">Next steps from your map</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed text-midnight/85">
                  {nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Secondary: the four ways to work with it */}
      <section className="mt-20 border-t border-midnight/15 pt-10">
        <h2 className="font-display text-2xl text-midnight">Continue your work</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.href}>
              <Link
                href={f.href}
                className={`block h-full rounded-md border border-midnight/15 p-5 transition-colors hover:border-midnight/40 hover:bg-tonal ${focusRing}`}
              >
                <span className="font-display text-lg text-midnight">{f.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-midnight/75">{f.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {dimensions.length > 0 && (
        <details className="mt-12">
          <summary className="cursor-pointer text-sm text-midnight underline underline-offset-4">
            See all six scores
          </summary>
          <div className="mt-3 max-w-md">
            {dimensions.map((d) => (
              <div key={d.key} className="flex justify-between border-b border-midnight/10 py-3 text-sm">
                <span>
                  {d.label}
                  {d.state ? <span className="text-mineral-deep"> · {d.state}</span> : null}
                </span>
                <span>{d.score}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="mt-8">
        <Link href="/assessment" className="text-sm text-mineral-deep underline underline-offset-4 hover:text-midnight">
          Retake the assessment
        </Link>
      </p>
    </main>
  );
}
