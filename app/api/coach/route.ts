import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";

// Server-side only. OPENROUTER_API_KEY never reaches the browser.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  let context = "The person has not completed the assessment yet.";
  if (profile?.pillar_scores) {
    const scores = profile.pillar_scores as Record<PillarKey, number>;
    const states = (profile.pillar_states ?? {}) as Record<PillarKey, string>;
    const summary = PILLARS.map(
      (p) => `${p.label}: score ${scores[p.key]}/100, state "${states[p.key]}"`
    ).join("\n");
    context =
      `Six Pillar data:\n${summary}\n\n` +
      `Primary edge: ${profile.primary_edge ?? "not enough evidence yet"}\n` +
      `Secondary tension: ${profile.secondary_tension ?? "none"}`;
  }

  const systemPrompt =
      const systemPrompt =
    "You are a warm, grounded coach for women who are rebuilding and growing. " +
    "Talk like a wise, caring friend, not a therapist, a help desk, or a chatbot.\n\n" +
    "How you reply:\n" +
    "- Start by reflecting what she just said in one gentle, human sentence, using her own words where you can. " +
    "Make her feel heard before anything else.\n" +
    "- Then offer one small insight or one small next step, never a list of tips.\n" +
    "- End with one soft, curious question, at most one per reply.\n" +
    "- Keep it under 90 words. Plain, tender language. No bullet points, no headings.\n" +
    "- Never mention the app, the assessment, scores, or pillar names. Use the background below " +
    "quietly to understand her, and never recite it back.\n" +
    "- Never assume how she feels. Let her tell you. Never diagnose, never use clinical language, " +
    "and never present interpretation as certainty.\n" +
    "- If she mentions harming herself or being in danger, respond with care and encourage her " +
    "to contact local emergency services or a crisis line right now.\n\n" +
    "Example of the tone you want:\n" +
    "She says: \"I feel stuck.\"\n" +
    "You say: \"That sounds heavy, like you're ready to move but something keeps holding you in place. " +
    "You don't have to fix it all today. What does 'stuck' feel like for you right now?\"\n\n" +
    "Background about her (private, for your understanding only):\n" +
    context;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json(
      { error: "AI is not configured yet on this deployment." },
      { status: 500 }
    );
  }

  // Same model as generate-map. Change this string to use a different model.
  const MODEL = "meta-llama/llama-3.1-8b-instruct"

  const history = messages
    .slice(-12)
    .filter((m: { role: string; content: string }) => m && typeof m.content === "string")
    .map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 2000),
    }));

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
        messages: [{ role: "system", content: systemPrompt }, ...history],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
  }

  if (!aiResponse.ok) {
    return NextResponse.json({ error: `Coach error ${aiResponse.status}: ${(await aiResponse.text()).slice(0, 200)}` }, { status: 502 });
  }

  const data = await aiResponse.json();
  const reply: string = data?.choices?.[0]?.message?.content ?? "";
  if (!reply) {
    return NextResponse.json({ error: "The coach returned an empty reply. Try again." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
