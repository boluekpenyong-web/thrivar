import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANSWER_KEYS = ["completed", "learned", "difficult", "changed", "avoided", "carryForward"];

// Saves the guided reflection for a week. One reflection per person per week:
// saving again updates it.
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

  const raw = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const key of ANSWER_KEYS) {
    const v = raw[key];
    answers[key] = typeof v === "string" ? v.slice(0, 3000) : "";
  }

  if (Object.values(answers).every((v) => v.trim() === "")) {
    return NextResponse.json({ error: "Write something in at least one box first." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_number", weekNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("weekly_reviews")
      .update({ answers })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "Could not save your reflection. Please try again." }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("weekly_reviews")
      .insert({ user_id: user.id, week_number: weekNumber, answers });
    if (error) {
      return NextResponse.json({ error: "Could not save your reflection. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
