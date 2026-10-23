import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";
import WeekClient, { type Assignment, type HistoryItem } from "@/components/WeekClient";

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

  const dimensions = PILLARS.map((p) => ({ key: p.key as string, label: p.label as string }));

  // Dimensions the map says may deserve attention (matched by key or label).
  const suggestedKeys = (Array.isArray(map?.priorities) ? (map!.priorities as unknown[]) : [])
    .map((p) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      const d = str(o.dimension).toLowerCase();
      return dimensions.find((x) => x.key === d || x.label.toLowerCase() === d)?.key ?? "";
    })
    .filter(Boolean);

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
  let journalCount: number | null = null;

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

    // Recorded activity since the week began. If the count cannot be read, it is simply not shown.
    if (startedAt) {
      const { count, error } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startedAt);
      if (!error && typeof count === "number") journalCount = count;
    }
  }

  // Earlier weeks, newest first
  const { data: allReviews } = await supabase
    .from("weekly_reviews")
    .select("week_number, answers")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false });
  const { data: allAssignments } = await supabase
    .from("weekly_assignments")
    .select("week_number, status")
    .eq("user_id", user.id);

  const history: HistoryItem[] = (allReviews ?? [])
    .filter((r) => r.week_number !== weekNumber)
    .map((r) => {
      const mine = (allAssignments ?? []).filter((a) => a.week_number === r.week_number);
      return {
        weekNumber: r.week_number as number,
        answers: (r.answers ?? {}) as Record<string, string>,
        planned: mine.length,
        completed: mine.filter((a) => a.status === "completed").length,
      };
    });

  const weekIsOld = startedAt ? Date.now() - new Date(startedAt).getTime() > 7 * 24 * 60 * 60 * 1000 : false;
  const startedLabel = startedAt
    ? new Date(startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
    : null;

  return (
    <main className="mx-auto max-w-[640px] px-5 pb-20 pt-10 text-midnight sm:pt-14">
      <h1 className="font-display text-3xl text-midnight sm:text-4xl">Weekly Assessment</h1>
      <p className="mt-3 leading-relaxed text-midnight/80">
        {hasWeek
          ? `Week ${weekNumber}${startedLabel ? `, started ${startedLabel}` : ""}. Review the week in your own words, then set the next one.`
          : "A structured review of your week, and a clear set of priorities for the next."}
      </p>

      {hasMap && focusWhy && (
        <div className="mt-8 border-t border-midnight/15 pt-5">
          <p className="text-xs uppercase tracking-[0.14em] text-mineral-deep">
            Your focus right now{focusStage ? ` · ${capitalise(focusStage)}` : ""}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-midnight/85">{focusWhy}</p>
        </div>
      )}

      {!hasMap && !hasWeek && (
        <p className="mt-8 text-sm leading-relaxed text-midnight/80">
          Your week is built from your map.{" "}
          <Link href="/home" className="text-midnight underline underline-offset-4">
            Generate it on Home
          </Link>
          , then come back.
        </p>
      )}

      <div className="mt-10">
        <WeekClient
          key={`${weekNumber}-${assignments.length}`}
          weekNumber={weekNumber}
          assignments={assignments}
          dimensions={dimensions}
          suggestedKeys={suggestedKeys}
          initialAnswers={review}
          journalCount={journalCount}
          weekIsOld={weekIsOld}
          hasMap={hasMap}
          history={history}
        />
      </div>

      <p className="mt-14 text-sm">
        <Link href="/home" className="text-midnight underline underline-offset-4">
          Back to Home
        </Link>
      </p>
    </main>
  );
}
