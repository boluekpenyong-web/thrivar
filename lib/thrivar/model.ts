// Thrivar core model: Six Pillars, Current State, Current Edge.
// This is intentionally rule-based and deterministic for v1 - no AI here.
// Current Tension and Current Focus are NOT computed in this file; they
// come from the AI narrative layer (next phase), which reads this output
// but adds its own interpretation on top.

export type PillarKey =
  | "identity"
  | "belonging"
  | "purpose"
  | "capacity"
  | "direction"
  | "agency";

export interface Pillar {
  key: PillarKey;
  label: string;
  question: string;
  q: string[]; // two questions per pillar, answered 1-10
}

export const PILLARS: Pillar[] = [
  {
    key: "identity",
    label: "Identity",
    question: "Who am I?",
    q: [
      "I know who I am, apart from my roles or achievements.",
      "I can name my own values, separate from what others expect of me.",
    ],
  },
  {
    key: "belonging",
    label: "Belonging",
    question: "Where and with whom do I belong?",
    q: [
      "I have people in my life who really know me.",
      "I feel like I belong somewhere, not just tolerated.",
    ],
  },
  {
    key: "purpose",
    label: "Purpose",
    question: "Why does my life matter?",
    q: [
      "I have a sense of why my life matters.",
      "What I spend my time on feels meaningful, not just necessary.",
    ],
  },
  {
    key: "capacity",
    label: "Capacity",
    question: "What can I currently hold, handle, and sustain?",
    q: [
      "I have the energy, resources, and support this season of life requires.",
      "Even when I know what to do, I have what it takes to actually do it.",
    ],
  },
  {
    key: "direction",
    label: "Direction",
    question: "Where am I going?",
    q: [
      "I have a clear sense of where my life is heading.",
      "My daily choices are actually moving me toward where I want to go.",
    ],
  },
  {
    key: "agency",
    label: "Agency",
    question: "Do I believe I can influence and move my life?",
    q: [
      "I believe my choices can genuinely change my life.",
      "When I decide something matters, I follow through and act on it.",
    ],
  },
];

// Ten non-clinical states. Ordered low-to-high for score-banding purposes
// only - in reality Grieving/Unraveling/Disconnected aren't strictly
// "worse" than each other, they're qualitatively different. A numeric-only
// v1 has to place them somewhere; once journal/reflection text feeds state
// detection later, this banding should be revisited rather than treated as
// the final word.
export const STATES = [
  "Surviving",
  "Unraveling",
  "Grieving",
  "Disconnected",
  "Stuck",
  "Reorienting",
  "Rebuilding",
  "Integrating",
  "Expanding",
  "Thriving",
] as const;
export type StateName = (typeof STATES)[number];

export function scoreToState(score: number): StateName {
  const bands: [number, StateName][] = [
    [10, "Surviving"],
    [20, "Unraveling"],
    [30, "Grieving"],
    [40, "Disconnected"],
    [50, "Stuck"],
    [60, "Reorienting"],
    [70, "Rebuilding"],
    [80, "Integrating"],
    [90, "Expanding"],
    [100, "Thriving"],
  ];
  for (const [max, state] of bands) {
    if (score <= max) return state;
  }
  return "Thriving";
}

// One default edge per pillar for v1. This is a simplification - richer,
// multi-edge nuance (e.g. Capacity strain sometimes being about Letting Go
// rather than raw Capacity) is deferred to the AI narrative layer once
// schema + logic are validated.
const PILLAR_TO_EDGE: Record<PillarKey, string> = {
  identity: "Self-trust",
  belonging: "Boundaries",
  purpose: "Direction",
  capacity: "Capacity",
  direction: "Decision-making",
  agency: "Courage",
};

export type PillarScores = Record<PillarKey, number>;
export type PillarStates = Record<PillarKey, StateName>;

export interface EdgeResult {
  primaryEdge: string | null;
  secondaryTension: string | null;
  insufficientEvidence: boolean;
}

export function identifyEdge(scores: PillarScores): EdgeResult {
  const entries = (Object.entries(scores) as [PillarKey, number][]).sort(
    (a, b) => a[1] - b[1]
  );
  const [lowestPillar, lowestScore] = entries[0];
  const [secondPillar, secondScore] = entries[1];
  const highest = entries[entries.length - 1][1];

  // Flat profile - no pillar stands out enough to name an edge honestly.
  if (highest - lowestScore < 8) {
    return { primaryEdge: null, secondaryTension: null, insufficientEvidence: true };
  }

  // Broadly thriving - even the lowest pillar isn't really strained.
  if (lowestScore >= 75) {
    return { primaryEdge: null, secondaryTension: null, insufficientEvidence: true };
  }

  const primaryEdge = PILLAR_TO_EDGE[lowestPillar];
  const gap = secondScore - lowestScore;
  const secondaryTension =
    gap <= 8 && secondScore < 65 ? PILLAR_TO_EDGE[secondPillar] : null;

  return { primaryEdge, secondaryTension, insufficientEvidence: false };
}

export interface ComputedProfile {
  pillarScores: PillarScores;
  pillarStates: PillarStates;
  primaryEdge: string | null;
  secondaryTension: string | null;
  insufficientEvidence: boolean;
}

// answers: keyed as `${pillarKey}_${questionIndex}`, values 1-10
export function computeProfile(answers: Record<string, number>): ComputedProfile {
  const pillarScores = {} as PillarScores;
  const pillarStates = {} as PillarStates;

  PILLARS.forEach((p) => {
    const vals = p.q.map((_, i) => answers[`${p.key}_${i}`] ?? 5);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const score = Math.round(avg * 10);
    pillarScores[p.key] = score;
    pillarStates[p.key] = scoreToState(score);
  });

  const edge = identifyEdge(pillarScores);

  return {
    pillarScores,
    pillarStates,
    primaryEdge: edge.primaryEdge,
    secondaryTension: edge.secondaryTension,
    insufficientEvidence: edge.insufficientEvidence,
  };
}
