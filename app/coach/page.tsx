"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col px-5 pt-6 text-ink">
      <header className="flex items-baseline justify-between border-b border-champagne/60 pb-4">
        <h1 className="font-display text-3xl text-aubergine">Your coach</h1>
        <Link
          href="/home"
          className="text-sm text-aubergine underline-offset-4 hover:underline"
        >
          Home
        </Link>
      </header>

      <div className="flex-1 py-6" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="leading-relaxed text-ink/75">
            Ask about a pillar, a decision you are facing, or what to focus on this week.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`my-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed rounded-xl ${
                m.role === "user"
                  ? "bg-aubergine text-cream rounded-br-sm"
                  : "bg-greige text-ink rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && <p className="my-3 text-sm text-plum">Thinking...</p>}
        {error && (
          <p role="alert" className="my-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-champagne/60 bg-cream py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
          aria-label="Message your coach"
          placeholder="Write to your coach"
          className="flex-1 rounded-lg border border-aubergine/25 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-aubergine/40"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-aubergine px-6 py-3 text-base text-cream transition-colors hover:bg-plum disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </main>
  );
}
