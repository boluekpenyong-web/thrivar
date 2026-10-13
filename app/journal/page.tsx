"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; body: string; created_at: string };

const ink = "#1f2933";
const navy = "#2b3a67";

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEntries(d.entries ?? []);
      })
      .catch(() => setError("Could not load your entries. Refresh to try again."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? "Could not save. Try again.");
      else {
        setEntries([d.entry, ...entries]);
        setText("");
      }
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px", color: ink }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, margin: 0 }}>Journal</h1>
      <p style={{ opacity: 0.75 }}>Write what is on your mind. Only you can see this.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="What happened today, and what did you notice?"
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 14,
          border: `1px solid ${ink}55`,
          fontSize: 16,
          lineHeight: 1.6,
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      <button
        onClick={save}
        disabled={saving}
        style={{
          marginTop: 10,
          padding: "12px 22px",
          borderRadius: 999,
          border: "none",
          background: navy,
          color: "#fff",
          fontSize: 16,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save entry"}
      </button>
      {error && <p style={{ color: "#b3261e" }}>{error}</p>}

      <section style={{ marginTop: 32 }}>
        {loading && <p style={{ opacity: 0.6 }}>Loading your entries...</p>}
        {!loading && entries.length === 0 && !error && (
          <p style={{ opacity: 0.75 }}>No entries yet. Your first one will appear here.</p>
        )}
        {entries.map((e) => (
          <article key={e.id} style={{ padding: "16px 0", borderTop: `1px solid ${ink}22` }}>
            <div style={{ fontSize: 14, opacity: 0.6 }}>
              {new Date(e.created_at).toLocaleString()}
            </div>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, margin: "6px 0 0" }}>{e.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
