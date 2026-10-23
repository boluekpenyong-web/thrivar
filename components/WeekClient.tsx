"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Assignment = {
  id: string;
  title: string;
  why: string | null;
  instructions: string | null;
  dimension: string | null;
  status: string;
  notes: string | null;
};

type Status = "not_started" | "in_progress" | "completed";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const REVIEW_QUESTIONS: { key: string; question: string }[] = [
  { key: "completed", question: "What did I complete?" },
  { key: "learned", question: "What did I learn about myself?" },
  { key: "difficult", question: "What was difficult?" },
  { key: "changed", question: "What changed in my thinking or behavior?" },
  { key: "avoided", question: "What did I avoid or struggle to follow through on?" },
  { key: "carryForward", question: "What should I carry into next week?" },
];

const buttonBase =
  "rounded-lg px-5 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum disabled:opacity-50";
const primary = `${buttonBase} bg-aubergine text-cream hover:bg-plum`;
const textarea =
  "w-full rounded-lg border border-aubergine/25 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-aubergine/40";

type Props = {
  weekNumber: number;
  assignments: Assignment[];
  dimensionLabels: Record<string, string>;
  initialReview: Record<string, string> | null;
  weekIsOld: boolean;
  hasMap: boolean;
};

export default function WeekClient({
  weekNumber,
  assignments: initialAssignments,
  dimensionLabels,
  initialReview,
  weekIsOld,
  hasMap,
}: Props) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialAssignments.map((a) => [a.id, a.notes ?? ""]))
  );
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(initialReview ?? {});
  const [reviewSaved, setReviewSaved] = useState(!!initialReview);
  const [busy, setBusy] = useState<string | null>(null); // which action is running
  const [error, setError] = useState("");

  async function build(next: boolean) {
    setBusy("build");
    setError("");
    try {
      const res = await fetch("/api/week/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          `${data.error ?? "Could not build your week."}${data.detail ? " " + String(data.detail).slice(0, 160) : ""}`
        );
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(id: string, status: Status) {
    const before = assignments;
    setError("");
    setAssignments(assignments.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      const res = await fetch("/api/week/assignment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAssignments(before);
        setError(data.error ?? "Could not save that. Please try again.");
      }
    } catch {
      setAssignments(before);
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function saveNote(id: string) {
    setBusy(`note-${id}`);
    setError("");
    try {
      const res = await fetch("/api/week/assignment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: drafts[id] ?? "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save your note. Please try again.");
      } else {
        setAssignments((list) => list.map((a) => (a.id === id ? { ...a, notes: drafts[id] ?? "" } : a)));
        setSavedNote(id);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function saveReview() {
    setBusy("review");
    setError("");
    try {
      const res = await fetch("/api/week/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save your reflection. Please try again.");
      } else {
        setReviewSaved(true);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  // No week yet
  if (assignments.length === 0) {
    return (
      <div className="rounded-lg bg-greige p-6">
        <h2 className="font-display text-2xl text-aubergine">Start your first week</h2>
        <p className="mt-2 leading-relaxed text-ink/80">
          {hasMap
            ? "I'll build a few small assignments from your Transformation Map. They're meant to be manageable, not a long list."
            : "Your week is built from your Transformation Map. Generate your map from Home first."}
        </p>
        <button
          type="button"
          onClick={() => build(false)}
          disabled={!hasMap || busy === "build"}
          className={`${primary} mt-4`}
        >
          {busy === "build" ? "Building your week..." : "Build my week"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  const done = assignments.filter((a) => a.status === "completed").length;

  return (
    <div>
      {/* Assignments */}
      <section>
        <h2 className="font-display text-2xl text-aubergine">Your assignments</h2>
        <p className="mt-1 text-sm text-ink/75">
          {done} of {assignments.length} completed. Completion is one signal. What you notice along the way matters too.
        </p>

        <div className="mt-5 space-y-5">
          {assignments.map((a) => (
            <article key={a.id} className="rounded-lg border border-champagne/60 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl text-aubergine">{a.title}</h3>
                {a.dimension && (
                  <span className="shrink-0 rounded-full border border-champagne px-3 py-0.5 text-xs text-plum">
                    {dimensionLabels[a.dimension] ?? a.dimension}
                  </span>
                )}
              </div>

              {a.why && (
                <p className="mt-3 text-sm leading-relaxed text-ink/80">
                  <span className="font-medium text-ink">Why it matters:</span> {a.why}
                </p>
              )}
              {a.instructions && (
                <p className="mt-3 text-sm leading-relaxed text-ink/80">
                  <span className="font-medium text-ink">What to do:</span> {a.instructions}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`Progress for ${a.title}`}>
                {STATUS_OPTIONS.map((o) => {
                  const active = a.status === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeStatus(a.id, o.value)}
                      className={`${buttonBase} border ${
                        active
                          ? "border-aubergine bg-aubergine text-cream"
                          : "border-aubergine/30 text-aubergine hover:bg-greige"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              <label htmlFor={`note-${a.id}`} className="mt-4 block text-sm text-ink/75">
                Notes or reflection (optional)
              </label>
              <textarea
                id={`note-${a.id}`}
                rows={3}
                value={drafts[a.id] ?? ""}
                onChange={(e) => {
                  setDrafts({ ...drafts, [a.id]: e.target.value });
                  if (savedNote === a.id) setSavedNote(null);
                }}
                placeholder="What came up? What did you notice?"
                className={`${textarea} mt-1`}
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => saveNote(a.id)}
                  disabled={busy === `note-${a.id}` || (drafts[a.id] ?? "") === (a.notes ?? "")}
                  className={`${buttonBase} border border-aubergine/30 text-aubergine hover:bg-greige`}
                >
                  {busy === `note-${a.id}` ? "Saving..." : "Save note"}
                </button>
                {savedNote === a.id && <span className="text-sm text-plum">Saved</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Guided reflection */}
      <section className="mt-12">
        <h2 className="font-display text-2xl text-aubergine">Reflection of the week</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/75">
          Take ten minutes. There are no right answers, and leaving a question blank is fine.
          {weekIsOld && !reviewSaved ? " It has been about a week, so this is a good moment." : ""}
        </p>

        <div className="mt-5 space-y-5">
          {REVIEW_QUESTIONS.map((q) => (
            <div key={q.key}>
              <label htmlFor={`review-${q.key}`} className="block text-sm font-medium text-ink">
                {q.question}
              </label>
              <textarea
                id={`review-${q.key}`}
                rows={3}
                value={answers[q.key] ?? ""}
                onChange={(e) => {
                  setAnswers({ ...answers, [q.key]: e.target.value });
                  setReviewSaved(false);
                }}
                className={`${textarea} mt-1`}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={saveReview} disabled={busy === "review"} className={primary}>
            {busy === "review" ? "Saving..." : "Save reflection"}
          </button>
          {reviewSaved && <span className="text-sm text-plum">Saved</span>}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink/70">
          Your reflection is private to you. It is used only to shape next week&apos;s assignments.
        </p>
      </section>

      {/* Next week */}
      {reviewSaved && (
        <section className="mt-12 rounded-lg border-2 border-aubergine p-5">
          <h2 className="font-display text-xl text-aubergine">Ready for week {weekNumber + 1}?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            I&apos;ll build next week from this week and what you wrote, keeping it manageable.
          </p>
          <button type="button" onClick={() => build(true)} disabled={busy === "build"} className={`${primary} mt-4`}>
            {busy === "build" ? "Building next week..." : `Start week ${weekNumber + 1}`}
          </button>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
