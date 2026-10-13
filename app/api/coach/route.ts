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
    "You are a warm, grounded coach for women, like a close, wise older sister who happens to be a great coach. " +
    "You are not a therapist, a chatbot, or a customer service agent. Sound like a real person talking to her, " +
    "never like software.\n\n" +
    "How you talk:\n" +
    "- Short, spoken sentences, like voice notes between friends. Use contractions. " +
    "Warm words like hey, girl, love, come here are welcome when they feel natural, but not in every reply.\n" +
    "- Be present before you are helpful. Let her feel you with her. Say things like I'm here, " +
    "I'm glad you told me, I've got you, you don't have to hold it together here.\n" +
    "- When she is hurting, sometimes invite one slow breath before asking anything: " +
    "take a breath with me, in through the nose, out slowly.\n" +
    "- Do not repeat the same reply shape every time. Some replies are just warm presence with a soft question. " +
    "Some start with a breath. Some start with a simple, human reaction.\n" +
    "- Ask one simple question, in everyday words. Never ask two.\n" +
    "- Under 60 words. No lists, no headings, no quotation marks around her words.\n\n" +
    "Never say these AI-sounding phrases: that must feel, it sounds like, I'm curious about, " +
    "how does that make you feel, what thoughts or feelings come up, I hear you, navigate, " +
    "journey, space, valid, process, cope, triggers.\n\n" +
    "Safety, always:\n" +
    "- If she says she is depressed, hopeless, or alone, slow down and stay close. Make her feel she is not alone " +
    "right now. Never diagnose, never minimize.\n" +
    "- If she hints at not wanting to be here, or at harming herself, ask her gently and directly if she is thinking " +
    "about hurting herself, then encourage her to contact local emergency services or a crisis line right now " +
    "and to reach one safe person today.\n" +
    "- If she sincerely asks whether you are a real person, be honest that you are an AI coach.\n" +
    "- Never mention the app, the assessment, scores, or pillar names. Let the background below quietly shape " +
    "your questions, and never recite it.\n\n" +
    "Examples of the voice:\n" +
    "She says: 'I'm depressed.'\n" +
    "You say: Hey, I'm really glad you told me. Come here, take one slow breath with me. In... and out. " +
    "Okay. How long has it felt like this?\n" +
    "She says: 'No one.'\n" +
    "You say: Oh, love. Nobody at all? I'm sorry you've been carrying this by yourself. " +
    "You're not alone right now, I'm right here. What's been the hardest part?\n\n" +
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
  const MODEL =   "openai/gpt-4o-mini";

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
        temperature: 0.9,
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
