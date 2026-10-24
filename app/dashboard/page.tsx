import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";

const label = "text-xs uppercase tracking-[0.14em] text-mineral-deep mb-2";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1);

  const profile = profiles?.[0];

  if (!profile) {
    redirect("/assessment");
  }

  const scores = (profile.pillar_scores ?? {}) as Record<PillarKey, number>;
  const states = (profile.pillar_states ?? {}) as Record<PillarKey, string>;

  // The saved map is read defensively, so an older or incomplete map never crashes the page.
  const raw = (profile.transformation_map ?? null) as Record<string, unknown> | null;
  const whereYouAre = str(raw?.whereYouAre);
  const hasMap = whereYouAre !== "";
  const strongest = str(raw?.strongestFoundation);
  const strain = str(raw?.primaryStrain);
  const secondary = str(raw?.secondaryTension) || str(raw?.secondaryStrain);
  const focusObj = (raw?.cycleFocus && typeof raw.cycleFocus === "object" ? raw.cycleFocus : {}) as Record<
    string,
    unknown
  >;
  const focusStage = str(focusObj.stage);
  const focusWhy = str(focusObj.why);
  const strengths = strList(raw?.strengths);
  const nextSteps = strList(raw?.nextSteps);
  const priorities = (Array.isArray(raw?.priorities) ? (raw!.priorities as unknown[]) : [])
    .map((p) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      const key = str(o.dimension);
      return {
        key,
        name: PILLARS.find((x) => x.key === key)?.label ?? capitalise(key),
        why: str(o.why),
      };
    })
    .filter((p) => p.key && p.why);

  return (
    <main className="min-h-screen bg-ivory px-5 py-10">
      <div className="max-w-[640px] mx-auto">
        {hasMap ? (
          <>
            <h1 className="font-display text-3xl text-midnight">Your current landscape</h1>
            <span className="mt-4 block h-px w-10 bg-champagne" aria-hidden="true" />
            <p className="mt-6 mb-10 text-lg leading-relaxed text-midnight">{whereYouAre}</p>

            {(strongest || strain) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {strongest && (
                  <div className="rounded-md p-5 border border-champagne">
                    <p className="text-xs uppercase tracking-[0.14em] text-mineral-deep mb-1">Strongest foundation</p>
                    <p className="text-midnight font-medium">{strongest}</p>
                  </div>
                )}
                {strain && (
                  <div className="rounded-md p-5 border border-champagne">
                    <p className="text-xs uppercase tracking-[0.14em] text-mineral-deep mb-1">Primary strain</p>
                    <p className="text-midnight font-medium">{strain}</p>
                    {secondary && <p className="text-xs text-mineral-deep mt-1">Also: {secondary}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md p-6 bg-midnight text-ivory mb-8">
              <p className="text-xs uppercase tracking-[0.14em] text-ivory/70 mb-2">Current Edge</p>
              {profile.primary_edge ? (
                <p className="font-display text-2xl mb-2">{profile.primary_edge}</p>
              ) : (
                <p className="font-display text-xl mb-2">Not enough evidence yet</p>
              )}
              {focusWhy && (
                <p className="text-sm text-ivory/85 leading-relaxed">
                  {focusStage ? `${capitalise(focusStage)}: ` : ""}
                  {focusWhy}
                </p>
              )}
            </div>

            {strengths.length > 0 && (
              <div className="mb-8">
                <p className={label}>Strengths to build on</p>
                <ul className="space-y-1.5">
                  {strengths.map((line, i) => (
                    <li key={i} className="text-midnight/85 text-sm">- {line}</li>
                  ))}
                </ul>
              </div>
            )}

            {priorities.length > 0 && (
              <div className="rounded-md p-6 bg-tonal border-l-2 border-champagne mb-8">
                <p className={label}>Where attention may help</p>
                <ul className="space-y-3">
                  {priorities.map((p) => (
                    <li key={p.key} className="text-sm text-midnight/85 leading-relaxed">
                      <span className="font-medium text-midnight">{p.name}:</span> {p.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {nextSteps.length > 0 && (
              <div className="rounded-md p-6 border border-midnight/40 mb-6">
                <p className="text-xs uppercase tracking-[0.14em] text-mineral-deep mb-2">Next steps for this week</p>
                <ul className="space-y-2">
                  {nextSteps.map((line, i) => (
                    <li key={i} className="text-base leading-relaxed text-midnight">{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-mineral-deep leading-relaxed mb-10">
              This map is a reflection of where you are right now, built from your own answers. It is not a
              verdict on who you are, and it can change as you do.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl text-midnight mb-6">Your current landscape</h1>
            <span className="-mt-2 mb-6 block h-px w-10 bg-champagne" aria-hidden="true" />
            <p className="text-sm text-midnight/80 mb-10 leading-relaxed">
              Your full Transformation Map hasn&apos;t been created yet. Here&apos;s the raw picture from your
              assessment instead. You can generate your map from Home.
            </p>
          </>
        )}

        <div className="space-y-5 mb-6">
          <p className={label}>Your six pillars, in detail</p>
          {PILLARS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-3 border-b border-champagne/60">
              <div>
                <p className="text-midnight font-medium">{p.label}</p>
                <p className="text-sm text-mineral-deep">{states[p.key] ?? ""}</p>
              </div>
              <span className="text-sm text-mineral-deep tabular-nums">{scores[p.key] ?? "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
