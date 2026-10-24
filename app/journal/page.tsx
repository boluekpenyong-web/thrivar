"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; body: string; created_at: string };

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
    <main className="mx-auto max-w-[640px] px-5 pb-20 pt-10 text-midnight sm:pt-14">
      <h1 className="font-display text-3xl text-midnight sm:text-4xl">Journal</h1>
      <span className="mt-4 block h-px w-10 bg-champagne" aria-hidden="true" />
      <p className="mt-3 leading-relaxed text-midnight/80">
        Write what is on your mind. Only you can see this.
      </p>

      <label htmlFor="entry" className="sr-only">
        New journal entry
      </label>
      <textarea
        id="entry"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="What happened today, and what did you notice?"
        className="mt-6 w-full rounded-md border border-midnight/20 bg-white px-4 py-3 text-base leading-relaxed text-midnight placeholder:text-mineral-deep focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || !text.trim()}
        className="mt-3 rounded-md bg-midnight px-6 py-2.5 text-sm text-ivory transition-colors hover:bg-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight disabled:bg-mineral disabled:text-ivory disabled:hover:bg-mineral"
      >
        {saving ? "Saving..." : "Save entry"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-12" aria-label="Your entries">
        {loading && <p className="text-sm text-mineral-deep">Loading your entries...</p>}
        {!loading && entries.length === 0 && !error && (
          <p className="text-sm text-mineral-deep">No entries yet. Your first one will appear here.</p>
        )}
        {entries.map((e) => (
          <article key={e.id} className="border-t border-champagne/70 py-5">
            <p className="text-xs uppercase tracking-[0.14em] text-mineral-deep">
              {new Date(e.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-midnight/90">{e.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
