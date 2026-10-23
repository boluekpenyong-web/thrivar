import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PILLARS } from "@/lib/thrivar/model";

// Server-side only. OPENROUTER_API_KEY never reaches the browser.
// Builds a small set of weekly assignments from the person's Transformation Map.
// For later weeks it also uses how the last week went and her reflection.

// Change this string to use a different model.
const MODEL = "openai/gpt-4o-mini";

const PILLAR_KEYS: string[] = PILLARS.map((p) => p.key);

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

const COLUMNS = "id, week_number, title, why, instructions, dimension, status, notes, created_at";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { next?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // an empty body is fine
  }
  const wantNext = body?.next === true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Take the assessment first." }, { status: 400 });
  }

  const map = (profile.transformation_map ?? null) as Record<string, unknown> | null;
  if (!map || !str(map.whereYouAre)) {
    return NextResponse.json(
      { error: "Generate your Transformation Map from Home first, so your week is built from it." },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("weekly_assignments")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .order("created_at", { ascending: true });

  const latestWeek = existing?.[0]?.week_number ?? 0;
  const currentRows = (existing ?? []).filter((r) => r.week_number === latestWeek);

  // Never create a second set by accident.
  if (latestWeek >= 1 && !wantNext) {
    return NextResponse.json({ ok: true, already: true, assignments: currentRows });
  }

  const newWeek = latestWeek + 1;

  // What the map says
  const focus = (map.cycleFocus && typeof map.cycleFocus === "object" ? map.cycleFocus : {}) as Record<
    string,
    unknown
  >;
  const priorities = (Array.isArray(map.priorities) ? map.priorities : [])
    .map((p) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return str(o.dimension) && str(o.why) ? `${str(o.dimension)}: ${str(o.why)}` : "";
    })
    .filter(Boolean);

  // How the last week went, if there was one
  let lastWeekText = "This is her first week.";
  let unfinished = 0;
  if (latestWeek >= 1) {
    unfinished = currentRows.filter((r) => r.status !== "completed").length;
    const lines = currentRows.map((r) => `- ${r.title} [${r.status}]`).join("\n");
    const { data: rev } = await supabase
      .from("weekly_reviews")
      .select("answers")
      .eq("user_id", user.id)
      .eq("week_number", latestWeek)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const a = (rev?.answers ?? {}) as Record<string, unknown>;
    lastWeekText =
      `Last week's assignments:\n${lines}\n` +
      `What she said was difficult: ${str(a.struggled) || str(a.difficult) || "not shared"}\n` +
      `What remains unresolved or she avoided: ${str(a.unresolved) || str(a.avoided) || "not shared"}\n` +
      `What she chose to focus on and commit to next: ${
        [str(a.action), str(a.commitment)].filter(Boolean).join(" / ") || str(a.carryForward) || "not shared"
      }`;
  }

  const count = unfinished >= 2 ? 2 : 3;

  const systemPrompt =
    "You are creating this week's assignments for one person inside THRIVAR, a personal transformation app. " +
    "Use only what is given. Never invent facts about her life. Never diagnose or use clinical language. " +
    `Create exactly ${count} assignments. Rules:\n` +
    "- Each one is small and achievable this week, about 10 to 30 minutes: a short piece of writing, a small experiment, " +
    "one decision, or one clear action. Quality over quantity.\n" +
    "- Ground each in her Transformation Map priorities and next steps, so it could not apply to just anyone.\n" +
    "- Things she can do herself. Do not hand the work to someone else, and never suggest therapy or 'talk to someone you trust' as an assignment.\n" +
    "- Spread them across no more than two dimensions.\n" +
    "- If she left things unfinished last week, never shame her. Make one assignment a smaller version of what was hard, and use her own words about what was difficult.\n" +
    "- Plain, warm language. No jargon, no motivational slogans.\n" +
    "Respond with ONLY valid JSON, no markdown, in exactly this shape: " +
    '{"assignments": [{"title": string (max 8 words), "why": string (one sentence on why it matters for her), ' +
    '"instructions": string (2 to 4 plain sentences saying exactly what to do and about how long it takes), ' +
    '"dimension": one of identity|belonging|purpose|capacity|direction|agency}]}';

  const userPrompt =
    `Her Transformation Map:\n` +
    `Where she is: ${str(map.whereYouAre)}\n` +
    `Primary strain: ${str(map.primaryStrain)}\n` +
    `Strongest foundation: ${str(map.strongestFoundation)}\n` +
    `Current focus: ${str(focus.stage)} (${str(focus.why)})\n` +
    `Where attention may help:\n${priorities.join("\n")}\n` +
    `Next steps from the map:\n${strList(map.nextSteps).join("\n")}\n\n` +
    `${lastWeekText}\n\n` +
    `Create the week ${newWeek} assignments now.`;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json({ error: "AI is not configured yet on this deployment." }, { status: 500 });
  }

  let aiResponse: Response;
  try {
    aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
  }

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    return NextResponse.json(
      { error: `AI request failed (${aiResponse.status}).`, detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  const aiData = await aiResponse.json();
  const rawText: string = aiData?.choices?.[0]?.message?.content ?? "";
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(start >= 0 && end > start ? rawText.slice(start, end + 1) : rawText);
  } catch {
    return NextResponse.json(
      { error: "Could not read the AI reply. Please try again.", detail: rawText.slice(0, 300) },
      { status: 502 }
    );
  }

  const list = (parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).assignments : null) as unknown;
  const items = (Array.isArray(list) ? list : [])
    .map((a) => {
      const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
      const dim = str(o.dimension).toLowerCase();
      return {
        title: str(o.title).slice(0, 120),
        why: str(o.why).slice(0, 500),
        instructions: str(o.instructions).slice(0, 1200),
        dimension: PILLAR_KEYS.includes(dim) ? dim : null,
      };
    })
    .filter((a) => a.title && a.instructions)
    .slice(0, 3);

  if (items.length === 0) {
    return NextResponse.json({ error: "The AI reply was incomplete. Please try again." }, { status: 502 });
  }

  // Guard against a double click creating two sets for the same week.
  const { data: dup } = await supabase
    .from("weekly_assignments")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("week_number", newWeek)
    .order("created_at", { ascending: true });
  if (dup && dup.length > 0) {
    return NextResponse.json({ ok: true, already: true, assignments: dup });
  }

  const now = Date.now();
  const { data: inserted, error: insertError } = await supabase
    .from("weekly_assignments")
    .insert(
      items.map((a, i) => ({
        user_id: user.id,
        week_number: newWeek,
        title: a.title,
        why: a.why || null,
        instructions: a.instructions,
        dimension: a.dimension,
        status: "not_started",
        created_at: new Date(now + i).toISOString(),
      }))
    )
    .select(COLUMNS);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignments: inserted ?? [] });
}
