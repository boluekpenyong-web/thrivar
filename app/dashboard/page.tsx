import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";
import LogoutButton from "./LogoutButton";

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

  return (
    <main className="min-h-screen bg-cream px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <span className="font-display text-xl text-cobalt">Thrivar</span>
          <LogoutButton />
        </div>

        <p className="text-sm text-ink/50 mb-2">Your current landscape</p>
        <h1 className="font-display text-3xl text-ink mb-10">
          Where you are right now
        </h1>

        <div className="space-y-5 mb-10">
          {PILLARS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-3 border-b border-ink/10">
              <div>
                <p className="text-ink font-medium">{p.label}</p>
                <p className="text-sm text-ink/50">{states[p.key]}</p>
              </div>
              <span className="text-sm text-ink/40 font-mono">{scores[p.key]}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-6 bg-cobalt text-cream mb-10">
          <p className="text-sm text-cream/70 mb-2">Current Edge</p>
          {profile.primary_edge ? (
            <>
              <p className="font-display text-2xl mb-1">{profile.primary_edge}</p>
              {profile.secondary_tension && (
                <p className="text-sm text-cream/75">
                  Also worth attention: {profile.secondary_tension}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm leading-relaxed text-cream/85">
              There isn&apos;t enough evidence yet to confidently name a single
              edge - your pillars are either closely balanced or broadly
              strong right now.
            </p>
          )}
        </div>

        <p className="text-sm text-ink/50 leading-relaxed">
          This is the raw picture from your assessment. The full Transformation
          Map - what&apos;s changing, what&apos;s staying, what matters now -
          is the next thing we build on top of this.
        </p>
      </div>
    </main>
  );
}
