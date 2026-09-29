"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

const ink = "#1f2933";
const navy = "#2b3a67";

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "24px 20px",
        color: ink,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: 0 }}>Your coach</h1>
        <Link href="/home" style={{ color: ink }}>Home</Link>
      </header>

      <div style={{ flex: 1, padding: "24px 0" }}>
        {messages.length === 0 && (
          <p style={{ opacity: 0.75, lineHeight: 1.6 }}>
            Ask about a pillar, a decision you are facing, or what to focus on this week.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              margin: "12px 0",
              padding: "12px 16px",
              borderRadius: 14,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              maxWidth: "88%",
              marginLeft: m.role === "user" ? "auto" : 0,
              background: m.role === "user" ? navy : `${ink}0d`,
              color: m.role === "user" ? "#fff" : ink,
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && <p style={{ opacity: 0.6 }}>Thinking...</p>}
        {error && <p style={{ color: "#b3261e" }}>{error}</p>}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 0, paddingBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write to your coach"
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 999,
            border: `1px solid ${ink}55`,
            fontSize: 16,
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: "12px 20px",
            borderRadius: 999,
            border: "none",
            background: navy,
            color: "#fff",
            fontSize: 16,
            opacity: loading ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
