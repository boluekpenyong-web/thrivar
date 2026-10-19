import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";
import LogoutButton from "./LogoutButton";

interface TransformationMap {
  whereYouAre: string;
  strongestFoundation: string;
  primaryStrain: string;
  secondaryStrain: string | null;
  whatsChanging: string[];
  whatsStaying: string[];
  tension: { wants: string; protecting: string; description: string } | null;
  whatsInTheWay: string[];
  currentEdgeNote: string;
  whatMattersNow: string;
  nextMove: string;
}

// Small labels were ink at 40-50% opacity, which is below accessible contrast on cream.
// They now use ink/70.
const label = "text-sm text-ink/70 mb-2";

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

  const scores = profile.pillar_scores as Record<PillarKey, number>;
  const states = profile.pillar_states as Record<PillarKey, string>;
  const map = profile.transformation_map as TransformationMap | null;

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="max-w-[640px] mx-auto">
        <div className="flex items-center justify-between mb-10">
          <span className="font-display text-xl tracking-[0.18em] text-aubergine">THRIVAR</span>
          <LogoutButton />
        </div>

        {map ? (
          <>
            <p className={label}>Your current landscape</p>
            <h1 className="font-display text-3xl text-aubergine mb-10">{map.whereYouAre}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <div className="rounded-lg p-5 bg-white border border-champagne/60">
                <p className="text-xs text-ink/70 mb-1">Strongest foundation</p>
                <p className="text-ink font-medium">{map.strongestFoundation}</p>
              </div>
              <div className="rounded-lg p-5 bg-white border border-champagne/60">
                <p className="text-xs text-ink/70 mb-1">Primary strain</p>
                <p className="text-ink font-medium">{map.primaryStrain}</p>
                {map.secondaryStrain && (
                  <p className="text-xs text-ink/70 mt-1">Also: {map.secondaryStrain}</p>
                )}
              </div>
            </div>

            {map.whatsChanging.length > 0 && (
              <div className="mb-8">
                <p className={label}>What&apos;s changing</p>
                <ul className="space-y-1.5">
                  {map.whatsChanging.map((line, i) => (
                    <li key={i} className="text-ink/80 text-sm">- {line}</li>
                  ))}
                </ul>
              </div>
            )}

            {map.whatsStaying.length > 0 && (
              <div className="mb-8">
                <p className={label}>What&apos;s staying</p>
                <ul className="space-y-1.5">
                  {map.whatsStaying.map((line, i) => (
                    <li key={i} className="text-ink/80 text-sm">- {line}</li>
                  ))}
                </ul>
              </div>
            )}

            {map.tension && (
              <div className="rounded-lg p-6 bg-greige mb-8">
                <p className={label}>Current tension</p>
                <p className="text-sm text-ink/80 leading-relaxed">
                  <span className="font-medium">What you want:</span> {map.tension.wants}
                  <br />
                  <span className="font-medium">What you&apos;re protecting:</span> {map.tension.protecting}
                </p>
                <p className="text-sm text-ink/80 mt-3 leading-relaxed">{map.tension.description}</p>
              </div>
            )}

            {map.whatsInTheWay.length > 0 && (
              <div className="mb-8">
                <p className={label}>What&apos;s getting in the way</p>
                <ul className="space-y-1.5">
                  {map.whatsInTheWay.map((line, i) => (
                    <li key={i} className="text-ink/80 text-sm">- {line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg p-6 bg-aubergine text-cream mb-8">
              <p className="text-sm text-cream/80 mb-2">Current Edge</p>
              {profile.primary_edge ? (
                <p className="font-display text-2xl mb-2">{profile.primary_edge}</p>
              ) : (
                <p className="font-display text-xl mb-2">Not enough evidence yet</p>
              )}
              <p className="text-sm text-cream/85 leading-relaxed">{map.currentEdgeNote}</p>
            </div>

            <div className="mb-8">
              <p className={label}>What matters now</p>
              <p className="text-ink/80 leading-relaxed">{map.whatMattersNow}</p>
            </div>

            <div className="rounded-lg p-6 border-2 border-aubergine mb-10">
              <p className="text-sm text-aubergine mb-2">Your next meaningful move</p>
              <p className="font-display text-xl text-ink">{map.nextMove}</p>
            </div>
          </>
        ) : (
          <>
            <p className={label}>Your current landscape</p>
            <h1 className="font-display text-3xl text-aubergine mb-6">Where you are right now</h1>
            <p className="text-sm text-ink/70 mb-10 leading-relaxed">
              Your full Transformation Map couldn&apos;t be generated this time - here&apos;s the raw
              picture from your assessment instead.
            </p>
          </>
        )}

        <div className="space-y-5 mb-6">
          <p className="text-sm text-ink/70">Your six pillars, in detail</p>
          {PILLARS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-3 border-b border-champagne/60">
              <div>
                <p className="text-ink font-medium">{p.label}</p>
                <p className="text-sm text-ink/70">{states[p.key]}</p>
              </div>
              <span className="text-sm text-ink/70 tabular-nums">{scores[p.key]}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
