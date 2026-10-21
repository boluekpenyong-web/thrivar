import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";
import { CYCLE, type CycleKey } from "@/lib/thrivar/cycle";

// Runs server-side only. OPENROUTER_API_KEY never reaches the browser.
// Generates the Transformation Map from the person's own assessment data,
// saves it onto the profile row, and keeps a snapshot for history.

// Change this string to use a different model.
const MODEL = "openai/gpt-4o-mini";

const PILLAR_KEYS: string[] = PILLARS.map((p) => p.key);
const CYCLE_KEYS: string[] = CYCLE.map((c) => c.key);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function strList(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : [];
}

function normalizeMap(raw: unknown) {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const focus = (m.cycleFocus && typeof m.cycleFocus === "object" ? m.cycleFocus : {}) as Record<string, unknown>;
  const stage = str(focus.stage).toLowerCase();
  const priorities = (Array.isArray(m.priorities) ? m.priorities : [])
    .map((p) => {
      const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return { dimension: str(o.dimension).toLowerCase(), why: str(o.why) };
    })
    .filter((p) => PILLAR_KEYS.includes(p.dimension) && p.why)
    .slice(0, 3);

  return {
    version: 2,
    whereYouAre: str(m.whereYouAre),
    strongestFoundation: str(m.strongestFoundation),
    primaryStrain: str(m.primaryStrain),
    secondaryTension: str(m.secondaryTension) || null,
    cycleFocus: {
      stage: (CYCLE_KEYS.includes(stage) ? stage : "recognize") as CycleKey,
      why: str(focus.why),
    },
    strengths: strList(m.strengths, 3),
    priorities,
    nextSteps: strList(m.nextSteps, 3),
  };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { profileId } = await request.json();
  if (!profileId) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const scores = profile.pillar_scores as Record<PillarKey, number>;
  const states = profile.pillar_states as Record<PillarKey, string>;

  const pillarSummary = PILLARS.map(
    (p) => `${p.label} (${p.key}): score ${scores[p.key]}/100, current state "${states[p.key]}"`
  ).join("\n");

  const cycleSummary = CYCLE.map((c) => `${c.key}: ${c.blurb}`).join("\n");

  const systemPrompt =
    "You are writing a personal Transformation Map for one person inside the Thrivar app, based only on their own " +
    "self-assessment. Scores are the average of two statements they rated from 1 to 10, multiplied by 10. " +
    "Ground every sentence in the data given. Never write generic self-help copy that could apply to anyone. " +
    "Never diagnose, never use clinical language, and never present interpretation as certainty: use phrases like " +
    "'it looks like' or 'this may mean'. Do not invent facts about their life. Be warm, plain and specific. " +
    "The Transformation Cycle has these stages:\n" + cycleSummary + "\n" +
    "Choose the single cycle stage that best fits where they are now (people mostly Stuck or Disconnected often " +
    "need to recognize or understand; Reorienting fits reorient; Rebuilding fits plan; Integrating or Expanding fit " +
    "practise or review). " +
    "Only include a secondary tension if the pattern of scores genuinely supports it; otherwise use null. " +
    "Next steps must be things she can do herself this week, such as a short piece of writing, a small experiment, " +
    "or one decision, tied to her priorities. Never make a next step 'talk to someone you trust', 'reach out to a friend', " +
    "or 'see a therapist'. Do not hand the work to someone else. " +
    "Respond with ONLY valid JSON, no markdown and no commentary, in exactly this shape: " +
    '{"whereYouAre": string (2-3 sentences), "strongestFoundation": string (1-2 sentences), ' +
    '"primaryStrain": string (1-2 sentences), "secondaryTension": string or null, ' +
    '"cycleFocus": {"stage": one of recognize|understand|reorient|plan|practise|review, "why": string (1-2 sentences)}, ' +
    '"strengths": [2 to 3 short strings], ' +
    '"priorities": [{"dimension": one of identity|belonging|purpose|capacity|direction|agency, "why": string}] (2 to 3 items), ' +
    '"nextSteps": [2 to 3 short, concrete, achievable actions for the next 7 days that she can do herself]}';

  const userPrompt =
    `Six dimension data:\n${pillarSummary}\n\n` +
    `Primary edge identified: ${profile.primary_edge ?? "not enough evidence yet"}\n` +
    `Secondary strain noted: ${profile.secondary_tension ?? "none"}\n\n` +
    "Generate the Transformation Map JSON now, grounded specifically in this data.";

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
        max_tokens: 1500,
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

  // Tolerate models that wrap JSON in code fences or add a stray sentence.
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(start >= 0 && end > start ? rawText.slice(start, end + 1) : rawText);
  } catch {
    return NextResponse.json(
      { error: "Could not parse AI output as JSON.", detail: rawText.slice(0, 300) },
      { status: 502 }
    );
  }

  const map = normalizeMap(parsed);
  if (!map.whereYouAre || !map.primaryStrain) {
    return NextResponse.json(
      { error: "The AI reply was incomplete. Please try again.", detail: rawText.slice(0, 300) },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ transformation_map: map })
    .eq("id", profileId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Keep a snapshot for history, only the first time this profile gets a map.
  // Non-fatal if it fails.
  if (!profile.transformation_map) {
    const { count } = await supabase
      .from("map_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    await supabase.from("map_snapshots").insert({
      user_id: user.id,
      kind: (count ?? 0) === 0 ? "initial" : "reassessment",
      pillar_scores: scores,
      pillar_states: states,
      map,
    });
  }

  return NextResponse.json({ ok: true, map });
}
