"use client";

import { useState } from "react";
import Link from "next/link";

export type MapDimension = {
  key: string;
  label: string;
  score: number; // 0-100
  state: string;
};

type Priority = { dimension: string; why: string };

type Props = {
  dimensions: MapDimension[]; // the six dimensions, in display order
  priorities?: Priority[]; // from the saved map, if any
  previous?: Record<string, number> | null; // scores from an earlier assessment, if any
};

// Brand colours (kept as hex so the SVG never depends on Tailwind purging).
const AUBERGINE = "#202039"; // Midnight Ink
const PLUM = "#777F91"; // Mineral Slate, used for the earlier outline
const CHAMPAGNE = "#C5B38B"; // Muted Champagne
const CREAM = "#F6F2EA"; // Warm Ivory
const INK = "#202039";

const CX = 220;
const CY = 180;
const R = 110;

function angle(i: number, n: number) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

function pt(i: number, n: number, ratio: number): [number, number] {
  const a = angle(i, n);
  return [CX + Math.cos(a) * R * ratio, CY + Math.sin(a) * R * ratio];
}

function polygon(ratios: number[]) {
  return ratios.map((r, i) => pt(i, ratios.length, r).join(",")).join(" ");
}

function ratioOf(score: number) {
  return Math.min(1, Math.max(0.06, score / 100));
}

export default function TransformationVisual({ dimensions, priorities = [], previous }: Props) {
  const n = dimensions.length;
  const priorityKeys = priorities.map((p) => p.dimension);
  const [selectedKey, setSelectedKey] = useState(
    priorityKeys.find((k) => dimensions.some((d) => d.key === k)) ?? dimensions[0]?.key
  );

  if (n < 3) return null;

  const selected = dimensions.find((d) => d.key === selectedKey) ?? dimensions[0];
  const selectedPriority = priorities.find((p) => p.dimension === selected.key);
  const earlier = previous && typeof previous[selected.key] === "number" ? previous[selected.key] : null;
  const delta = earlier === null ? null : selected.score - earlier;

  const nowRatios = dimensions.map((d) => ratioOf(d.score));
  const prevRatios = previous ? dimensions.map((d) => ratioOf(previous[d.key] ?? 0)) : null;
  const summary = dimensions.map((d) => `${d.label} ${d.score} out of 100`).join(", ");

  return (
    <div>
      <svg
        viewBox="0 0 440 360"
        role="img"
        aria-label={`Your six dimensions right now: ${summary}.`}
        className="mx-auto block w-full max-w-[440px]"
      >
        {/* guide rings */}
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={polygon(Array(n).fill(level))}
            fill="none"
            stroke={CHAMPAGNE}
            strokeWidth={1.25}
            opacity={level === 1 ? 1 : 0.75}
          />
        ))}

        {/* spokes */}
        {dimensions.map((d, i) => {
          const [x, y] = pt(i, n, 1);
          return <line key={d.key} x1={CX} y1={CY} x2={x} y2={y} stroke={CHAMPAGNE} strokeWidth={1.25} opacity={0.85} />;
        })}

        {/* earlier assessment (dashed) */}
        {prevRatios && (
          <polygon
            points={polygon(prevRatios)}
            fill="none"
            stroke={PLUM}
            strokeWidth={2}
            strokeDasharray="5 4"
            opacity={0.95}
          />
        )}

        {/* now */}
        <polygon points={polygon(nowRatios)} fill={AUBERGINE} fillOpacity={0.1} stroke={AUBERGINE} strokeWidth={2} strokeLinejoin="round" />

        {/* points */}
        {dimensions.map((d, i) => {
          const [x, y] = pt(i, n, ratioOf(d.score));
          const isSelected = d.key === selected.key;
          const isPriority = priorityKeys.includes(d.key);
          return (
            <g key={d.key} onClick={() => setSelectedKey(d.key)} style={{ cursor: "pointer" }}>
              {isPriority && <circle cx={x} cy={y} r={12} fill="none" stroke={CHAMPAGNE} strokeWidth={3} />}
              <circle cx={x} cy={y} r={isSelected ? 7 : 5} fill={isSelected ? CREAM : AUBERGINE} stroke={AUBERGINE} strokeWidth={2} />
              {/* larger invisible target for touch */}
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          );
        })}

        {/* labels */}
        {dimensions.map((d, i) => {
          const [x, y] = pt(i, n, 1.24);
          const a = angle(i, n);
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          const dy = sin > 0.3 ? 12 : sin < -0.3 ? -2 : 4;
          return (
            <text
              key={d.key}
              x={x}
              y={y + dy}
              textAnchor={anchor}
              fontSize={13}
              fontWeight={d.key === selected.key ? 600 : 400}
              fill={d.key === selected.key ? AUBERGINE : INK}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedKey(d.key)}
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      <p className="mt-1 text-center text-xs text-mineral-deep">
        <span className="inline-block h-0.5 w-4 translate-y-[-3px] bg-aubergine align-middle" /> Right now
        {prevRatios && (
          <>
            <span className="mx-2">·</span>
            <span
              className="inline-block h-0 w-4 translate-y-[-3px] border-t-2 border-dashed align-middle"
              style={{ borderColor: PLUM }}
            />{" "}
            Your earlier assessment
          </>
        )}
        {priorityKeys.length > 0 && (
          <>
            <span className="mx-2">·</span>
            <span
              className="inline-block h-3 w-3 translate-y-[-1px] rounded-full border-2 align-middle"
              style={{ borderColor: CHAMPAGNE }}
            />{" "}
            Worth attention
          </>
        )}
      </p>

      {/* tappable dimension selector (also the keyboard and screen reader route) */}
      <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose a dimension to read about">
        {dimensions.map((d) => {
          const active = d.key === selected.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelectedKey(d.key)}
              aria-pressed={active}
              className={`rounded-md border px-3.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight ${
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

      {/* what the selected dimension is saying */}
      <div className="mt-5 rounded-md bg-tonal p-5" aria-live="polite">
        <h3 className="font-display text-xl text-midnight">{selected.label}</h3>
        <p className="mt-1 text-sm text-mineral-deep">
          {selected.state ? `${selected.state} · ` : ""}
          {selected.score} out of 100
        </p>
        <p className="mt-3 text-sm leading-relaxed text-midnight/80">
          This reflects how true the statements about {selected.label.toLowerCase()} felt to you when you answered.
        </p>
        {selectedPriority && (
          <p className="mt-3 text-sm leading-relaxed text-ink">
            <span className="font-medium">Why it may deserve attention:</span> {selectedPriority.why}
          </p>
        )}
        {delta !== null && (
          <p className="mt-3 text-sm leading-relaxed text-midnight/80">
            {delta === 0
              ? "Your answer here is the same as in your earlier assessment."
              : `Your answers here moved ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points since your earlier assessment. That is one signal, so check it against what you have actually lived.`}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/coach" className="text-midnight underline underline-offset-4">
            Talk about {selected.label.toLowerCase()} with your coach
          </Link>
          <Link href="/journal" className="text-midnight underline underline-offset-4">
            Write about it
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-mineral-deep">
        Each score comes from two statements you rated, scaled to 100. This picture is a mirror for reflection, not a
        measurement of who you are, and it can change as you do.
      </p>
    </div>
  );
}
