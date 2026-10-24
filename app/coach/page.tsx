"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };
type Convo = { id: string; title: string; updated_at: string };

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight";

function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function CoachPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); // null = a new conversation
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const [showList, setShowList] = useState(false); // mobile only
  const endRef = useRef<HTMLDivElement>(null);

  async function refreshList() {
    try {
      const res = await fetch("/api/coach");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversations)) setConvos(data.conversations);
      }
    } catch {
      // The list is a convenience; the coach still works without it.
    }
  }

  useEffect(() => {
    (async () => {
      await refreshList();
      setLoadingList(false);
    })();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, loading, loadingThread]);

  async function openConvo(id: string) {
    if (id === activeId || loading) {
      setShowList(false);
      return;
    }
    setError("");
    setActiveId(id);
    setMessages([]);
    setLoadingThread(true);
    setShowList(false);
    try {
      const res = await fetch(`/api/coach?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.messages)) setMessages(data.messages);
      else setError("Could not open that conversation. Try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoadingThread(false);
    }
  }

  function newConvo() {
    if (loading) return;
    setActiveId(null);
    setMessages([]);
    setError("");
    setInput("");
    setShowList(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || loadingThread) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, conversationId: activeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setMessages([...next, { role: "assistant", content: data.reply }]);
        if (data.conversationId) setActiveId(data.conversationId);
        refreshList();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteConvo(c: Convo) {
    if (!window.confirm(`Delete "${c.title}"? It will be removed from your account.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/coach?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
      if (res.ok) {
        setConvos((list) => list.filter((x) => x.id !== c.id));
        if (c.id === activeId) {
          setActiveId(null);
          setMessages([]);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the conversation. Try again.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  const list = (
    <nav aria-label="Conversations">
      <button
        type="button"
        onClick={newConvo}
        className={`w-full rounded-md bg-midnight px-4 py-2.5 text-sm text-ivory transition-colors hover:bg-plum ${focusRing}`}
      >
        New conversation
      </button>

      <p className="mt-6 text-xs uppercase tracking-[0.14em] text-mineral-deep">Your conversations</p>
      {loadingList && <p className="mt-3 text-sm text-mineral-deep">Loading...</p>}
      {!loadingList && convos.length === 0 && (
        <p className="mt-3 text-sm leading-relaxed text-mineral-deep">
          Your conversations will be saved here, so you can come back to them.
        </p>
      )}
      <ul className="mt-2 space-y-0.5">
        {convos.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => openConvo(c.id)}
                aria-current={active ? "true" : undefined}
                className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors ${focusRing} ${
                  active ? "bg-tonal text-midnight" : "text-midnight/85 hover:bg-tonal"
                }`}
              >
                <span className="block truncate text-sm">{c.title}</span>
                <span className="block text-xs text-mineral-deep">{when(c.updated_at)}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteConvo(c)}
                aria-label={`Delete conversation: ${c.title}`}
                className={`rounded-md px-2 py-2 text-xs text-mineral-deep hover:text-midnight ${focusRing}`}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const activeTitle = convos.find((c) => c.id === activeId)?.title;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[960px] flex-col px-5 pt-6 text-midnight">
      <header className="flex items-baseline justify-between border-b border-midnight/15 pb-4">
        <h1 className="font-display text-3xl text-midnight">Your coach</h1>
        <div className="flex items-baseline gap-4">
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            aria-expanded={showList}
            className={`text-sm text-midnight underline-offset-4 hover:underline lg:hidden ${focusRing}`}
          >
            Conversations
          </button>
          <Link href="/home" className={`text-sm text-midnight underline-offset-4 hover:underline ${focusRing}`}>
            Home
          </Link>
        </div>
      </header>

      <div className="flex flex-1 gap-10">
        <aside className="hidden w-[250px] shrink-0 py-6 lg:block">{list}</aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {showList && <div className="border-b border-midnight/15 py-5 lg:hidden">{list}</div>}

          <div className="flex-1 py-6" role="log" aria-live="polite">
            {activeTitle && <p className="mb-4 text-xs uppercase tracking-[0.14em] text-mineral-deep">{activeTitle}</p>}

            {loadingThread && <p className="text-sm text-mineral-deep">Opening conversation...</p>}

            {!loadingThread && messages.length === 0 && (
              <p className="leading-relaxed text-midnight/80">
                Ask about a pillar, a decision you are facing, or what to focus on this week. Each conversation is
                saved on its own.
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`my-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-4 py-3 text-[15px] leading-relaxed ${
                    m.role === "user" ? "rounded-br-sm bg-midnight text-ivory" : "rounded-bl-sm bg-tonal text-midnight"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && <p className="my-3 text-sm text-mineral-deep">Thinking...</p>}
            {error && (
              <p role="alert" className="my-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <div className="sticky bottom-14 flex gap-2 border-t border-midnight/15 bg-ivory py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
              }}
              aria-label="Message your coach"
              placeholder="Write to your coach"
              className="flex-1 rounded-md border border-midnight/20 bg-white px-4 py-3 text-base text-midnight placeholder:text-mineral-deep focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight"
            />
            <button
              onClick={send}
              disabled={loading || loadingThread || !input.trim()}
              className="rounded-md bg-midnight px-6 py-3 text-base text-ivory transition-colors hover:bg-plum disabled:bg-mineral disabled:text-ivory disabled:hover:bg-mineral"
            >
              Send
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
