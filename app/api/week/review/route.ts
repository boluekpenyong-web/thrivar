import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";

// Weekly Assessment answers. One assessment per person per week: saving again updates it.
// Older reflections (completed, learned, difficult, changed, avoided, carryForward) stay readable.
const TEXT_KEYS = [
  "setOut", "did", "discovered",
  "progress", "followedThrough", "evidence",
  "struggled", "patterns", "unresolved",
  "taught", "adjust",
  "action", "commitment",
];
const PILLAR_KEYS: string[] = PILLARS.map((p) => p.key as string);

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const weekNumber = typeof body.weekNumber === "number" ? Math.floor(body.weekNumber) : 0;
  if (!weekNumber || weekNumber < 1) {
    return NextResponse.json({ error: "Missing week" }, { status: 400 });
  }
  const complete = body.complete === true;

  const raw = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const incoming: Record<string, string> = {};
  for (const key of TEXT_KEYS) {
    const v = raw[key];
    incoming[key] = typeof v === "string" ? v.slice(0, 3000) : "";
  }
  const focus = typeof raw.focusDimension === "string" ? raw.focusDimension : "";
  incoming.focusDimension = PILLAR_KEYS.includes(focus) ? focus : "";

  if (Object.values(incoming).every((v) => v.trim() === "")) {
    return NextResponse.json({ error: "Write something in at least one box first." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("weekly_reviews")
    .select("id, answers")
    .eq("user_id", user.id)
    .eq("week_number", weekNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Keep anything already saved (including older-style answers and the completion time).
  const before = (existing?.answers && typeof existing.answers === "object" ? existing.answers : {}) as Record<
    string,
    string
  >;
  const answers: Record<string, string> = { ...before, ...incoming };
  if (complete) answers.completedAt = new Date().toISOString();

  if (existing?.id) {
    const { error } = await supabase
      .from("weekly_reviews")
      .update({ answers })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "Could not save your assessment. Please try again." }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("weekly_reviews")
      .insert({ user_id: user.id, week_number: weekNumber, answers });
    if (error) {
      return NextResponse.json({ error: "Could not save your assessment. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, completedAt: answers.completedAt ?? null });
}
