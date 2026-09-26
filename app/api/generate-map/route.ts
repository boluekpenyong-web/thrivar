import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";

// Runs server-side only. OPENROUTER_API_KEY never reaches the browser.
// Generates the Transformation Map narrative once per assessment and
// caches it onto the profile row - it is not regenerated on every view.
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
    (p) => `${p.label}: score ${scores[p.key]}/100, current state "${states[p.key]}"`
  ).join("\n");

  const systemPrompt =
    "You are generating a Transformation Map for a person inside the Thrivar app, based on their Six Pillars assessment (Identity, Belonging, Purpose, Capacity, Direction, Agency). " +
    "Ground every sentence in the actual data given - never write generic self-help copy that could apply to anyone. " +
    "Never diagnose, never use clinical language, never present interpretation as certainty. " +
    "Only include a tension if it is genuinely supported by the pattern of scores given; if it is not clearly supported, set tension to null rather than inventing one - uncertainty is preferable to manufactured insight. " +
    "Respond with ONLY valid JSON, no markdown formatting, no commentary before or after, matching exactly this shape: " +
    '{"whereYouAre": string, "strongestFoundation": string, "primaryStrain": string, "secondaryStrain": string_or_null, "whatsChanging": string[], "whatsStaying": string[], "tension": {"wants": string, "protecting": string, "description": string}_or_null, "whatsInTheWay": string[], "currentEdgeNote": string, "whatMattersNow": string, "nextMove": string}';

  const userPrompt =
    `Six Pillar data:\n${pillarSummary}\n\n` +
    `Primary Edge identified: ${profile.primary_edge ?? "not enough evidence yet"}\n` +
    `Secondary strain noted: ${profile.secondary_tension ?? "none"}\n\n` +
    "Generate the Transformation Map JSON now, grounded specifically in this data.";

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json({ error: "AI is not configured yet on this deployment." }, { status: 500 });
  }

  // Free-tier model by default. Swap to a paid model any time by changing
  // this string once billing is set up on OpenRouter (e.g.
  // "anthropic/claude-3.5-sonnet" or "openai/gpt-4o-mini").
  const MODEL = "meta-llama/llama-3.1-8b-instruct:free";

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
    return NextResponse.json({ error: "AI request failed", detail }, { status: 502 });
  }

  const aiData = await aiResponse.json();
  const rawText: string = aiData?.choices?.[0]?.message?.content ?? "";

  let mapData: unknown;
  try {
    mapData = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Could not parse AI output as JSON.", raw: rawText }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ transformation_map: mapData })
    .eq("id", profileId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, map: mapData });
}
  }
 
  return NextResponse.json({ ok: true, map: mapData });
}
 
