import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";
import GenerateMapButton from "@/components/GenerateMapButton";

const primaryButton =
  "inline-block rounded-lg bg-aubergine px-6 py-3 text-sm text-cream transition-colors hover:bg-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";
const secondaryButton =
  "inline-block rounded-lg border border-aubergine/30 px-6 py-3 text-sm text-aubergine transition-colors hover:bg-greige focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";

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
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // New here? Start with the assessment.
  if (!profile) redirect("/assessment");

  const scores = (profile?.pillar_scores ?? null) as Record<string, number> | null;
  const states = (profile?.pillar_states ?? null) as Record<string, string> | null;
  const map = (profile?.transformation_map ?? null) as Record<string, unknown> | null;
  const mapEntries = map
    ? Object.entries(map).filter(([, v]) => typeof v === "string")
    : [];

  const label = (k: string) =>
    k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  return (
    <main className="mx-auto max-w-[640px] px-5 py-12 text-ink">
      <h1 className="font-display text-4xl text-aubergine">Welcome back</h1>
      <p className="mt-2 text-ink/75">
        {profile
          ? "Here is where you are and what to do next."
          : "Take the assessment to see where you are."}
      </p>

      <div className="mb-10 mt-6 flex flex-wrap gap-3">
        {profile ? (
          <>
            <Link href="/coach" className={primaryButton}>
              Talk to your coach
            </Link>
            <Link href="/journal" className={secondaryButton}>
              Journal
            </Link>
            <Link href="/dashboard" className={secondaryButton}>
              See your pillars
            </Link>
          </>
        ) : (
          <Link href="/assessment" className={primaryButton}>
            Start the assessment
          </Link>
        )}
      </div>

      {scores && (
        <section className="mb-10">
          <h2 className="mb-2 font-display text-2xl text-aubergine">Your six pillars</h2>
          {PILLARS.map((p) => (
            <div
              key={p.key}
              className="flex justify-between border-b border-champagne/60 py-3"
            >
              <span>
                {p.label}
                <span className="text-plum"> · {states?.[p.key] ?? ""}</span>
              </span>
              <span>{scores[p.key] ?? "-"}</span>
            </div>
          ))}
        </section>
      )}

      {mapEntries.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-2xl text-aubergine">
            Your Transformation Map
          </h2>
          {mapEntries.map(([k, v]) => (
            <div key={k} className="my-5 border-l-2 border-champagne pl-4">
              <strong className="font-medium text-aubergine">{label(k)}</strong>
              <p className="mt-1 leading-relaxed">{v as string}</p>
            </div>
          ))}
        </section>
      )}

      {profile && mapEntries.length === 0 && (
        <GenerateMapButton profileId={profile.id} />
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
