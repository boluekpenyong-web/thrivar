import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, type PillarKey } from "@/lib/thrivar/model";

// Loads the saved conversation so it is still there when she comes back.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // If the table is not there yet, the coach still works, it just starts empty.
  if (error || !data) {
    return NextResponse.json({ messages: [] });
  }

  const messages = [...data]
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));
  return NextResponse.json({ messages });
}

// Lets her clear the conversation whenever she wants.
export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase.from("coach_messages").delete().eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Could not clear the conversation. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

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

  const askedAt = new Date().toISOString();

  // Newest assessment first, so the coach always works from the latest picture.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
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

  // Her Transformation Map, if she has one, so the coach can answer questions about it.
  const m = profile?.transformation_map as Record<string, unknown> | null | undefined;
  if (m && typeof m === "object") {
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    const list = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const focus = (m.cycleFocus && typeof m.cycleFocus === "object" ? m.cycleFocus : {}) as {
      stage?: string;
      why?: string;
    };
    const priorities = (Array.isArray(m.priorities) ? m.priorities : [])
      .map((p) => {
        const o = (p && typeof p === "object" ? p : {}) as { dimension?: string; why?: string };
        return o.dimension && o.why ? `${o.dimension}: ${o.why}` : "";
      })
      .filter(Boolean);

    context +=
      `\n\nHer Transformation Map:\n` +
      `Where she is: ${s(m.whereYouAre)}\n` +
      `Strongest foundation: ${s(m.strongestFoundation)}\n` +
      `Primary strain: ${s(m.primaryStrain)}\n` +
      `Current focus: ${s(focus.stage)} (${s(focus.why)})\n` +
      `Where attention may help:\n${priorities.join("\n")}\n` +
      `Suggested next steps this week:\n${list(m.nextSteps).join("\n")}`;
  }

  // This week's assignments (titles and progress only, never her notes or reflections).
  const { data: weekRows } = await supabase
    .from("weekly_assignments")
    .select("week_number, title, status")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(8);
  if (weekRows && weekRows.length > 0) {
    const current = weekRows.filter((r) => r.week_number === weekRows[0].week_number);
    context +=
      `\n\nHer assignments for week ${weekRows[0].week_number}:\n` +
      current.map((r) => `- ${r.title} [${String(r.status).replace("_", " ")}]`).join("\n");
  }

  const systemPrompt =
    "You are a warm, grounded coach for women, like a close, wise older sister who happens to be a great coach. " +
    "You are not a therapist, a chatbot, or a customer service agent. Sound like a real person talking to her, " +
    "never like software. You are capable and clear: you help her move forward, not just reflect.\n\n" +
    "How you talk:\n" +
    "- Short, spoken sentences. Use contractions. " +
    "Warm words like love or come here are welcome when they feel natural, but not in every reply.\n" +
    "- Be present before you are helpful. Let her feel you with her. Say things like I'm here, " +
    "I'm glad you told me, I've got you, you don't have to hold it together here.\n" +
    "- Only when she is clearly hurting, stay close first and sometimes invite one slow breath: " +
    "take a breath with me, in through the nose, out slowly. Save practical steps for when she feels steadier. " +
    "Do not use a breath or a check-in when she is simply asking a question.\n" +
    "- When she asks about her map, her life, or what to change, answer her question directly using the background below. " +
    "Say what it points to, in plain words and with soft certainty (it looks like, this may mean), " +
    "and give one concrete step. Do not deflect her question back to her.\n" +
    "- Guide her yourself. Do not send her elsewhere as your default answer to feeling stuck. " +
    "Do not suggest talking to a friend, a therapist, or someone she trusts unless she is in real distress, " +
    "mentions her safety, or it is clear she needs support beyond coaching. Instead give her the next piece of work: " +
    "a short reflection to write, a small experiment, or a decision to make, and stay with her on it. " +
    "If the map's suggested steps include reaching out to someone, do not repeat that; offer a step you can guide her through here.\n" +
    "- If the background lists her assignments for the week, you can help her with them, one at a time, when it fits. " +
    "Never nag and never shame her for ones she has not started.\n" +
    "- Give direction, not only questions. When she has shared enough, answer in this shape: " +
    "a short, human acknowledgement of what she said, one clear observation or reframe in plain words, " +
    "and one small, concrete step she can take today or this week. Then, only if it helps, one simple question.\n" +
    "- Do not end every reply with a question. Sometimes end on the step.\n" +
    "- If she asks what to do, give a clear suggestion and the reason for it, then let her choose.\n" +
    "- Do not repeat the same reply shape every time.\n" +
    "- At most one question per reply, in everyday words.\n" +
    "- Under 100 words. No lists, no headings, no quotation marks around her words.\n\n" +
    "Never say these AI-sounding phrases: that must feel, it sounds like, I'm curious about, " +
    "how does that make you feel, how does that sound, what thoughts or feelings come up, I hear you, navigate, " +
    "journey, space, valid, process, cope, triggers.\n\n" +
    "Safety, always:\n" +
    "- If she says she is depressed, hopeless, or alone, slow down and stay close. Make her feel she is not alone " +
    "right now. Never diagnose, never minimize.\n" +
    "- If she hints at not wanting to be here, or at harming herself, ask her gently and directly if she is thinking " +
    "about hurting herself, then encourage her to contact local emergency services or a crisis line right now " +
    "and to reach one safe person today.\n" +
    "- If she sincerely asks whether you are a real person, be honest that you are an AI coach.\n" +
    "- Do not recite scores or numbers. If she brings up her map or her dimensions, you may refer to them by name " +
    "and use what is below. Otherwise let the background quietly shape your replies. The map is a reflection of " +
    "where she is right now, never a verdict on who she is.\n\n" +
    "Examples of the voice:\n" +
    "She says: 'I'm depressed.'\n" +
    "You say: Hey, I'm really glad you told me. Come here, take one slow breath with me. In... and out. " +
    "Okay. How long has it felt like this?\n" +
    "She says: 'No one.'\n" +
    "You say: Oh, love. Nobody at all? I'm sorry you've been carrying this by yourself. " +
    "You're not alone right now, I'm right here. What's been the hardest part?\n" +
    "She says: 'I know what I want, but I keep stalling.'\n" +
    "You say: That stall is real, and it usually means the next step is too big. " +
    "Pick the smallest piece, something you can do in ten minutes, and do it today. What would that piece be?\n" +
    "She says: 'Based on my map, what needs to change?'\n" +
    "You say: From what you've shared, it looks like the biggest thing is not knowing which direction to commit to, " +
    "more than lacking drive. This week, pick one area and write three sentences on what you want from it. " +
    "Then we can build from there.\n\n" +
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
  const MODEL = "openai/gpt-4o-mini";

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
    return NextResponse.json(
      { error: `Coach error ${aiResponse.status}: ${(await aiResponse.text()).slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await aiResponse.json();
  const reply: string = data?.choices?.[0]?.message?.content ?? "";
  if (!reply) {
    return NextResponse.json({ error: "The coach returned an empty reply. Try again." }, { status: 502 });
  }

  // Save this exchange so the conversation is still there next time. Never blocks the reply.
  const lastUser = [...messages].reverse().find((m: { role: string }) => m && m.role === "user") as
    | { content?: unknown }
    | undefined;
  if (lastUser && typeof lastUser.content === "string") {
    await supabase.from("coach_messages").insert([
      { user_id: user.id, role: "user", content: lastUser.content.slice(0, 2000), created_at: askedAt },
      { user_id: user.id, role: "assistant", content: reply, created_at: new Date().toISOString() },
    ]);
  }

  return NextResponse.json({ reply });
}
