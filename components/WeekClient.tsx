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

export type HistoryItem = {
  weekNumber: number;
  answers: Record<string, string>;
  planned: number;
  completed: number;
};

type Status = "not_started" | "in_progress" | "completed";
type Answers = Record<string, string>;

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

type Field = { key: string; question: string };
type Step = { id: string; title: string; intro: string; fields: Field[] };

// The recommended framework: five steps, a few questions each. Every question is optional.
const STEPS: Step[] = [
  {
    id: "reflection",
    title: "Reflection",
    intro: "Start with what actually happened, not what you meant to happen.",
    fields: [
      { key: "setOut", question: "What did I set out to work on this week?" },
      { key: "did", question: "What did I actually do?" },
      { key: "discovered", question: "What did I discover about myself?" },
    ],
  },
  {
    id: "progress",
    title: "Progress",
    intro: "Look for evidence, however small.",
    fields: [
      { key: "progress", question: "What meaningful progress did I make?" },
      { key: "followedThrough", question: "Which commitments did I follow through on?" },
      { key: "evidence", question: "What evidence of growth can I recognise?" },
    ],
  },
  {
    id: "challenges",
    title: "Challenges",
    intro: "Be honest about what was hard. Nothing here is a verdict on you.",
    fields: [
      { key: "struggled", question: "Where did I struggle or become stuck?" },
      { key: "patterns", question: "What patterns, obstacles, or unmet needs deserve attention?" },
      { key: "unresolved", question: "What remains unresolved?" },
    ],
  },
  {
    id: "learning",
    title: "Learning",
    intro: "Turn the week into something you can use.",
    fields: [
      { key: "taught", question: "What did this week teach me?" },
      { key: "adjust", question: "What should I continue, change, or approach differently?" },
    ],
  },
  {
    id: "next",
    title: "Next week",
    intro: "Choose less, and make it specific.",
    fields: [
      { key: "action", question: "What specific action will I take?" },
      { key: "commitment", question: "What commitment am I willing to make for the coming week?" },
    ],
  },
];

// Every question that can appear in a saved assessment, including the first version's questions,
// so earlier weeks always stay readable.
const QUESTION_TEXT: Record<string, string> = {
  setOut: "What I set out to work on",
  did: "What I actually did",
  discovered: "What I discovered about myself",
  progress: "Meaningful progress",
  followedThrough: "Commitments I followed through on",
  evidence: "Evidence of growth",
  struggled: "Where I struggled or got stuck",
  patterns: "Patterns, obstacles or unmet needs",
  unresolved: "What remains unresolved",
  taught: "What this week taught me",
  adjust: "What to continue, change or approach differently",
  action: "The action I chose",
  commitment: "My commitment for next week",
  // first version
  completed: "What I completed",
  learned: "What I learned about myself",
  difficult: "What was difficult",
  changed: "What changed in my thinking or behaviour",
  avoided: "What I avoided or struggled to follow through on",
  carryForward: "What I wanted to carry into next week",
};

const REPORTED_KEYS = ["did", "progress", "followedThrough", "evidence", "taught", "adjust", "completed", "learned", "changed"];
const ATTENTION_KEYS = ["struggled", "patterns", "unresolved", "difficult", "avoided"];
const HISTORY_ORDER = [
  "setOut", "did", "discovered", "completed", "learned",
  "progress", "followedThrough", "evidence", "changed",
  "struggled", "patterns", "unresolved", "difficult", "avoided",
  "taught", "adjust",
  "action", "commitment", "carryForward",
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight";
const buttonBase = `rounded-md px-5 py-2.5 text-sm transition-colors disabled:opacity-50 ${focusRing}`;
const primary = `${buttonBase} bg-midnight text-ivory hover:bg-plum`;
const outline = `${buttonBase} border border-midnight/30 text-midnight hover:bg-tonal`;
const textarea = `w-full rounded-md border border-midnight/20 bg-white px-4 py-3 text-base text-midnight placeholder:text-mineral-deep focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight`;
const label = "text-xs uppercase tracking-[0.14em] text-mineral-deep";

const has = (v: string | undefined) => typeof v === "string" && v.trim() !== "";
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

type Props = {
  weekNumber: number;
  assignments: Assignment[];
  dimensions: { key: string; label: string }[];
  suggestedKeys: string[];
  initialAnswers: Answers | null;
  journalCount: number | null;
  weekIsOld: boolean;
  hasMap: boolean;
  history: HistoryItem[];
};

export default function WeekClient({
  weekNumber,
  assignments: initialAssignments,
  dimensions,
  suggestedKeys,
  initialAnswers,
  journalCount,
  weekIsOld,
  hasMap,
  history,
}: Props) {
  const router = useRouter();
  const dimensionLabels = Object.fromEntries(dimensions.map((d) => [d.key, d.label]));

  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialAssignments.map((a) => [a.id, a.notes ?? ""]))
  );
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});
  // An assessment counts as complete if it was finished, or if it is a first-version reflection.
  const legacy = !!initialAnswers && !initialAnswers.completedAt && ATTENTION_KEYS.concat(["completed", "learned", "carryForward"]).some((k) => has(initialAnswers[k]));
  const [done, setDone] = useState<boolean>(!!initialAnswers?.completedAt || legacy);
  const [step, setStep] = useState(0);
  const [showSteps, setShowSteps] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedHint, setSavedHint] = useState(false);

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

  // Saves the assessment. A draft is saved as you move between steps; "complete" finishes it.
  async function persist(complete: boolean): Promise<boolean> {
    const anything = Object.entries(answers).some(([k, v]) => k !== "completedAt" && has(v));
    if (!anything) return true; // nothing to save yet
    setError("");
    try {
      const res = await fetch("/api/week/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber, answers, complete }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save your assessment. Please try again.");
        return false;
      }
      if (complete) setAnswers((a) => ({ ...a, completedAt: data.completedAt ?? new Date().toISOString() }));
      setSavedHint(true);
      return true;
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      return false;
    }
  }

  async function goTo(i: number) {
    setBusy("step");
    await persist(false);
    setBusy(null);
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
  }

  async function finish() {
    setBusy("finish");
    const ok = await persist(true);
    setBusy(null);
    if (ok) {
      setDone(true);
      setStep(0);
    }
  }

  function setAnswer(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setSavedHint(false);
  }

  // No week yet
  if (assignments.length === 0) {
    return (
      <div className="border-t border-midnight/15 pt-6">
        <h2 className="font-display text-2xl text-midnight">Plan your first week</h2>
        <p className="mt-2 leading-relaxed text-midnight/80">
          {hasMap
            ? "A few small steps, built from your Transformation Map. Manageable, not a long list. At the end of the week you will review it here."
            : "Your week is built from your Transformation Map. Generate your map from Home first."}
        </p>
        <button
          type="button"
          onClick={() => build(false)}
          disabled={!hasMap || busy === "build"}
          className={`${primary} mt-5`}
        >
          {busy === "build" ? "Building your week..." : "Build my week"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <History items={history} dimensionLabels={dimensionLabels} />
      </div>
    );
  }

  const completedCount = assignments.filter((a) => a.status === "completed").length;
  const inProgress = assignments.filter((a) => a.status === "in_progress");
  const unfinished = assignments.filter((a) => a.status !== "completed");
  const notesCount = assignments.filter((a) => has(a.notes ?? "")).length;
  const current = STEPS[step];

  return (
    <div>
      {/* Steps for this week */}
      <section aria-labelledby="steps-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="steps-heading" className="font-display text-2xl text-midnight">
            Steps for this week
          </h2>
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            aria-expanded={showSteps}
            className={`text-sm text-midnight underline underline-offset-4 ${focusRing}`}
          >
            {showSteps ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1 text-sm text-mineral-deep">
          {completedCount} of {assignments.length} marked complete. Completion is one signal. What you notice along the
          way matters too.
        </p>

        {showSteps && (
          <div className="mt-5 space-y-4">
            {assignments.map((a) => (
              <article key={a.id} className="rounded-md border border-champagne p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg text-midnight">{a.title}</h3>
                  {a.dimension && (
                    <span className="shrink-0 rounded-full border border-champagne px-3 py-0.5 text-xs text-mineral-deep">
                      {dimensionLabels[a.dimension] ?? a.dimension}
                    </span>
                  )}
                </div>

                {a.why && (
                  <p className="mt-3 text-sm leading-relaxed text-midnight/80">
                    <span className="font-medium text-midnight">Why it matters:</span> {a.why}
                  </p>
                )}
                {a.instructions && (
                  <p className="mt-2 text-sm leading-relaxed text-midnight/80">
                    <span className="font-medium text-midnight">What to do:</span> {a.instructions}
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
                            ? "border-midnight bg-midnight text-ivory"
                            : "border-midnight/25 text-midnight hover:bg-tonal"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                <label htmlFor={`note-${a.id}`} className="mt-4 block text-sm text-mineral-deep">
                  Notes (optional)
                </label>
                <textarea
                  id={`note-${a.id}`}
                  rows={2}
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
                    className={outline}
                  >
                    {busy === `note-${a.id}` ? "Saving..." : "Save note"}
                  </button>
                  {savedNote === a.id && <span className="text-sm text-mineral-deep">Saved</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* The assessment */}
      <section className="mt-14 border-t border-champagne pt-10" aria-labelledby="assess-heading">
        <h2 id="assess-heading" className="font-display text-2xl text-midnight">
          {done ? `Your assessment of week ${weekNumber}` : "Assess your week"}
        </h2>

        {!done && (
          <>
            <p className="mt-1 text-sm leading-relaxed text-mineral-deep">
              Your words lead this. Every question is optional, and your answers are private to you.
              {weekIsOld && !answers.completedAt ? " It has been about a week, so this is a good moment." : ""}
            </p>

            {/* progress indicator */}
            <ol className="mt-6 grid grid-cols-5 gap-2" aria-label="Assessment steps">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === step ? "step" : undefined}
                    className={`block w-full text-left ${focusRing}`}
                  >
                    <span
                      className={`block h-1 rounded-full ${i === step ? "bg-midnight" : i < step ? "bg-champagne" : "bg-midnight/15"}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`mt-2 block text-xs ${i === step ? "font-medium text-midnight" : "text-mineral-deep"}`}
                    >
                      <span className="sm:hidden">{i + 1}</span>
                      <span className="hidden sm:inline">{s.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-8">
              <p className={label}>
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="mt-1 font-display text-xl text-midnight">{current.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-midnight/80">{current.intro}</p>

              {current.id === "next" && (
                <fieldset className="mt-6">
                  <legend className="block text-sm font-medium text-midnight">
                    What is the most important area to focus on?
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dimensions.map((d) => {
                      const active = answers.focusDimension === d.key;
                      const suggested = suggestedKeys.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setAnswer("focusDimension", active ? "" : d.key)}
                          className={`${buttonBase} border ${
                            active
                              ? "border-midnight bg-midnight text-ivory"
                              : "border-midnight/25 text-midnight hover:bg-tonal"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  {suggestedKeys.length > 0 && (
                    <p className="mt-2 text-xs text-mineral-deep">
                      Your map suggests attention may help in{" "}
                      {Array.from(new Set(suggestedKeys))
                        .map((k) => dimensionLabels[k] ?? k)
                        .join(" and ")}
                      . Choose what feels right to you.
                    </p>
                  )}
                </fieldset>
              )}

              <div className="mt-6 space-y-5">
                {current.fields.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`q-${f.key}`} className="block text-sm font-medium text-midnight">
                      {f.question}
                    </label>
                    <textarea
                      id={`q-${f.key}`}
                      rows={3}
                      value={answers[f.key] ?? ""}
                      onChange={(e) => setAnswer(f.key, e.target.value)}
                      className={`${textarea} mt-1`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {step > 0 && (
                  <button type="button" onClick={() => goTo(step - 1)} disabled={busy === "step"} className={outline}>
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={() => goTo(step + 1)} disabled={busy === "step"} className={primary}>
                    {busy === "step" ? "Saving..." : "Continue"}
                  </button>
                ) : (
                  <button type="button" onClick={finish} disabled={busy === "finish"} className={primary}>
                    {busy === "finish" ? "Saving..." : "Complete assessment"}
                  </button>
                )}
                {savedHint && <span className="text-sm text-mineral-deep">Draft saved</span>}
              </div>
            </div>
          </>
        )}

        {done && (
          <Summary
            weekNumber={weekNumber}
            answers={answers}
            assignments={assignments}
            completedCount={completedCount}
            inProgressCount={inProgress.length}
            unfinished={unfinished}
            notesCount={notesCount}
            journalCount={journalCount}
            dimensionLabels={dimensionLabels}
            onEdit={() => {
              setDone(false);
              setStep(0);
            }}
            onNext={() => build(true)}
            building={busy === "build"}
          />
        )}
      </section>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-700">
          {error}
        </p>
      )}

      <History items={history} dimensionLabels={dimensionLabels} />
    </div>
  );
}

function Summary({
  weekNumber,
  answers,
  assignments,
  completedCount,
  inProgressCount,
  unfinished,
  notesCount,
  journalCount,
  dimensionLabels,
  onEdit,
  onNext,
  building,
}: {
  weekNumber: number;
  answers: Answers;
  assignments: Assignment[];
  completedCount: number;
  inProgressCount: number;
  unfinished: Assignment[];
  notesCount: number;
  journalCount: number | null;
  dimensionLabels: Record<string, string>;
  onEdit: () => void;
  onNext: () => void;
  building: boolean;
}) {
  const reported = REPORTED_KEYS.filter((k) => has(answers[k]));
  const attention = ATTENTION_KEYS.filter((k) => has(answers[k]));

  // Concise assessment: built only from what was recorded and what she wrote. No scores, no verdicts.
  const parts: string[] = [];
  if (assignments.length > 0) {
    parts.push(
      `You marked ${completedCount} of ${assignments.length} planned ${assignments.length === 1 ? "step" : "steps"} complete.`
    );
  }
  if (journalCount !== null && journalCount > 0) {
    parts.push(`You wrote ${journalCount} journal ${journalCount === 1 ? "entry" : "entries"} this week.`);
  }
  const main = answers.struggled || answers.unresolved || answers.difficult || answers.avoided;
  if (has(main)) parts.push(`In your words, the hardest part was: “${clip(main.trim(), 160)}”`);

  // Priorities: her own choices first, then anything left undone.
  const priorities: { text: string; tag?: string }[] = [];
  const focusLabel = answers.focusDimension ? dimensionLabels[answers.focusDimension] : undefined;
  if (has(answers.action)) priorities.push({ text: answers.action.trim(), tag: focusLabel });
  else if (focusLabel) priorities.push({ text: `Give attention to ${focusLabel.toLowerCase()}.` });
  if (has(answers.commitment)) priorities.push({ text: answers.commitment.trim() });
  if (has(answers.carryForward) && priorities.length < 3) priorities.push({ text: answers.carryForward.trim() });
  if (unfinished.length > 0 && priorities.length < 3) {
    priorities.push({
      text:
        unfinished.length === 1
          ? `Come back to “${unfinished[0].title}”, or let it go on purpose.`
          : `Decide what to do with the ${unfinished.length} steps left open: continue, shrink or let go.`,
    });
  }

  return (
    <div className="mt-6">
      {parts.length > 0 && <p className="leading-relaxed text-midnight">{parts.join(" ")}</p>}

      <div className="mt-8 space-y-8">
        <div>
          <p className={label}>What you reported</p>
          {reported.length === 0 ? (
            <p className="mt-2 text-sm text-midnight/80">You did not write about progress this week. That is fine.</p>
          ) : (
            <dl className="mt-3 space-y-4">
              {reported.map((k) => (
                <div key={k}>
                  <dt className="text-sm font-medium text-midnight">{QUESTION_TEXT[k]}</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-midnight/85">{answers[k]}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="border-t border-midnight/15 pt-6">
          <p className={label}>What your record shows</p>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-midnight/85">
            {assignments.map((a) => (
              <li key={a.id}>
                {a.title}
                <span className="text-mineral-deep">
                  {" "}
                  · {STATUS_OPTIONS.find((o) => o.value === a.status)?.label ?? a.status}
                </span>
              </li>
            ))}
            {notesCount > 0 && (
              <li className="text-mineral-deep">
                Notes written on {notesCount} {notesCount === 1 ? "step" : "steps"}.
              </li>
            )}
            {journalCount !== null && (
              <li className="text-mineral-deep">
                {journalCount} journal {journalCount === 1 ? "entry" : "entries"} since the week began.
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-mineral-deep">
            This is recorded activity only. It cannot show how meaningful the week was; your own account above does that.
          </p>
        </div>

        <div className="border-t border-midnight/15 pt-6">
          <p className={label}>What needs attention</p>
          {unfinished.length === 0 && attention.length === 0 ? (
            <p className="mt-2 text-sm text-midnight/80">Nothing flagged. If something is on your mind, add it by editing your answers.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {unfinished.length > 0 && (
                <p className="text-sm leading-relaxed text-midnight/85">
                  Still open: {unfinished.map((a) => a.title).join("; ")}
                  {inProgressCount > 0 ? ` (${inProgressCount} in progress)` : ""}.
                </p>
              )}
              {attention.map((k) => (
                <div key={k}>
                  <p className="text-sm font-medium text-midnight">{QUESTION_TEXT[k]}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-midnight/85">{answers[k]}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-midnight/15 pt-6">
          <p className={label}>Priorities for next week</p>
          {priorities.length === 0 ? (
            <p className="mt-2 text-sm text-midnight/80">You have not set priorities yet. Edit your answers to add them.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {priorities.slice(0, 3).map((p, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-midnight/90">
                  <span className="font-display text-base text-midnight">{i + 1}</span>
                  <span>
                    {p.text}
                    {p.tag && (
                      <span className="ml-2 rounded-full border border-champagne px-2.5 py-0.5 text-xs text-mineral-deep">
                        {p.tag}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={onNext} disabled={building} className={primary}>
          {building ? "Building next week..." : `Start week ${weekNumber + 1}`}
        </button>
        <button type="button" onClick={onEdit} className={outline}>
          Edit my answers
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-mineral-deep">
        Next week’s steps are built from your map and what you wrote here, and kept manageable.
      </p>
    </div>
  );
}

function History({
  items,
  dimensionLabels,
}: {
  items: HistoryItem[];
  dimensionLabels: Record<string, string>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-14 border-t border-champagne pt-10" aria-labelledby="history-heading">
      <h2 id="history-heading" className="font-display text-2xl text-midnight">
        Previous assessments
      </h2>
      <p className="mt-1 text-sm text-mineral-deep">Look back for patterns, and for how far you have come.</p>
      <div className="mt-5 divide-y divide-midnight/10 border-y border-midnight/10">
        {items.map((h) => {
          const keys = HISTORY_ORDER.filter((k) => has(h.answers[k]));
          return (
            <details key={h.weekNumber} className="group py-4">
              <summary className={`flex cursor-pointer items-baseline justify-between gap-4 text-sm ${focusRing}`}>
                <span className="font-medium text-midnight">Week {h.weekNumber}</span>
                <span className="text-mineral-deep">
                  {h.planned > 0 ? `${h.completed} of ${h.planned} steps complete` : "No steps recorded"}
                </span>
              </summary>
              <div className="mt-4 space-y-4">
                {h.answers.focusDimension && (
                  <p className="text-sm text-midnight/85">
                    <span className="font-medium text-midnight">Focus chosen:</span>{" "}
                    {dimensionLabels[h.answers.focusDimension] ?? h.answers.focusDimension}
                  </p>
                )}
                {keys.length === 0 && !h.answers.focusDimension && (
                  <p className="text-sm text-midnight/80">Nothing was written for this week.</p>
                )}
                {keys.map((k) => (
                  <div key={k}>
                    <p className="text-sm font-medium text-midnight">{QUESTION_TEXT[k]}</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-midnight/85">{h.answers[k]}</p>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
