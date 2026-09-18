"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PILLARS, computeProfile } from "@/lib/thrivar/model";

interface QuestionRef {
  pillarKey: string;
  pillarLabel: string;
  qIndex: number;
  text: string;
}

export default function AssessmentPage() {
  const router = useRouter();
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [val, setVal] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allQuestions: QuestionRef[] = useMemo(() => {
    const out: QuestionRef[] = [];
    PILLARS.forEach((p) => {
      p.q.forEach((text, i) => {
        out.push({ pillarKey: p.key, pillarLabel: p.label, qIndex: i, text });
      });
    });
    return out;
  }, []);

  const current = allQuestions[qIndex];
  const pct = (qIndex / allQuestions.length) * 100;

  async function handleContinue() {
    const updated = { ...answers, [`${current.pillarKey}_${current.qIndex}`]: val };
    setAnswers(updated);

    if (qIndex + 1 < allQuestions.length) {
      setQIndex(qIndex + 1);
      setVal(5);
      return;
    }

    setSaving(true);
    setError("");
    const computed = computeProfile(updated);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be logged in to save your results.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: user.id,
      pillar_scores: computed.pillarScores,
      pillar_states: computed.pillarStates,
      primary_edge: computed.primaryEdge,
      secondary_tension: computed.secondaryTension,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function handleBack() {
    if (qIndex === 0) return;
    setQIndex(qIndex - 1);
    setVal(5);
  }

  return (
    <main className="min-h-screen flex flex-col bg-cream">
      <div className="h-1 bg-sandSoft">
        <div
          className="h-1 bg-electric transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-7">
        <div className="max-w-lg w-full">
          <p className="text-sm mb-1 text-cobalt">{current.pillarLabel}</p>
          <p className="text-sm mb-9 text-ink/45">
            Question {qIndex + 1} of {allQuestions.length}
          </p>

          <h2 className="font-display text-3xl mb-12 leading-snug text-ink">
            {current.text}
          </h2>

          <div className="mb-3 flex justify-between text-sm text-ink/45">
            <span>Not true</span>
            <span>Very true</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            className="w-full h-2 accent-cobalt"
          />

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <div className="flex justify-between items-center mt-10">
            <button
              onClick={handleBack}
              disabled={qIndex === 0 || saving}
              className="text-sm text-ink/40 disabled:opacity-0"
            >
              Back
            </button>
            <button
              onClick={handleContinue}
              disabled={saving}
              className="px-7 py-3 rounded-full bg-cobalt text-cream text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : qIndex + 1 === allQuestions.length ? "See my results" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
