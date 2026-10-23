import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";
import WeekClient, { type Assignment } from "@/components/WeekClient";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function WeekPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile) redirect("/assessment");

  const map = (profile.transformation_map ?? null) as Record<string, unknown> | null;
  const hasMap = str(map?.whereYouAre) !== "";
  const focusObj = (map?.cycleFocus && typeof map.cycleFocus === "object" ? map.cycleFocus : {}) as Record<
    string,
    unknown
  >;
  const focusStage = str(focusObj.stage);
  const focusWhy = str(focusObj.why);

  const dimensionLabels = Object.fromEntries(PILLARS.map((p) => [p.key as string, p.label as string]));

  // The current week is the highest week she has assignments for.
  const { data: latest } = await supabase
    .from("weekly_assignments")
    .select("week_number")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .limit(1);

  const hasWeek = (latest?.length ?? 0) > 0;
  const weekNumber = latest?.[0]?.week_number ?? 1;

  let assignments: Assignment[] = [];
  let startedAt: string | null = null;
  let review: Record<string, string> | null = null;

  if (hasWeek) {
    const { data: rows } = await supabase
      .from("weekly_assignments")
      .select("id, title, why, instructions, dimension, status, notes, created_at")
      .eq("user_id", user.id)
      .eq("week_number", weekNumber)
      .order("created_at", { ascending: true });

    assignments = (rows ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      why: (r.why as string | null) ?? null,
      instructions: (r.instructions as string | null) ?? null,
      dimension: (r.dimension as string | null) ?? null,
      status: (r.status as string) ?? "not_started",
      notes: (r.notes as string | null) ?? null,
    }));
    startedAt = (rows?.[0]?.created_at as string | undefined) ?? null;

    const { data: rev } = await supabase
      .from("weekly_reviews")
      .select("answers")
      .eq("user_id", user.id)
      .eq("week_number", weekNumber)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    review = (rev?.answers ?? null) as Record<string, string> | null;
  }

  const weekIsOld = startedAt ? Date.now() - new Date(startedAt).getTime() > 7 * 24 * 60 * 60 * 1000 : false;
  const startedLabel = startedAt
    ? new Date(startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
    : null;

  return (
    <main className="mx-auto max-w-[640px] px-5 py-12 text-ink">
      <h1 className="font-display text-4xl text-aubergine">This week</h1>
      <p className="mt-2 text-ink/75">
        {hasWeek
          ? `Week ${weekNumber}${startedLabel ? `, started ${startedLabel}` : ""}. A few small steps, then a moment to reflect.`
          : "Small, manageable steps built from your Transformation Map, and a weekly moment to reflect."}
      </p>

      {hasMap && focusWhy && (
        <div className="my-6 border-l-2 border-champagne pl-4">
          <strong className="font-medium text-aubergine">
            Your focus right now{focusStage ? `: ${capitalise(focusStage)}` : ""}
          </strong>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">{focusWhy}</p>
        </div>
      )}

      {!hasMap && !hasWeek && (
        <p className="my-6 text-sm leading-relaxed text-ink/80">
          Your week is built from your map. <Link href="/home" className="text-aubergine underline underline-offset-4">Generate it on Home</Link>, then come back.
        </p>
      )}

      <div className="mt-8">
        <WeekClient
          key={`${weekNumber}-${assignments.length}`}
          weekNumber={weekNumber}
          assignments={assignments}
          dimensionLabels={dimensionLabels}
          initialReview={review}
          weekIsOld={weekIsOld}
          hasMap={hasMap}
        />
      </div>

      <p className="mt-12 text-sm">
        <Link href="/home" className="text-aubergine underline underline-offset-4">
          Back to Home
        </Link>
      </p>
    </main>
  );
}
