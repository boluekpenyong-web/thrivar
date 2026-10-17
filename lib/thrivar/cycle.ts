// The Thrivar Transformation Cycle. Repeatable, not a one-way journey.
// This is separate from the six dimensions (what a person is working on).

export type CycleKey =
  | "recognize"
  | "understand"
  | "reorient"
  | "plan"
  | "practise"
  | "review";

export const CYCLE: { key: CycleKey; label: string; blurb: string }[] = [
  { key: "recognize", label: "Recognize", blurb: "Naming what is happening and what needs attention." },
  { key: "understand", label: "Understand", blurb: "Exploring the beliefs, experiences and patterns behind it." },
  { key: "reorient", label: "Reorient", blurb: "Finding a clearer view of what to change, accept or strengthen." },
  { key: "plan", label: "Plan", blurb: "Turning insight into realistic actions." },
  { key: "practise", label: "Practise", blurb: "Applying it in real life, consistently." },
  { key: "review", label: "Review", blurb: "Reflecting on what changed and adjusting." },
];
