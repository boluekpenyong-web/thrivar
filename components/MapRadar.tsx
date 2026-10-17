"use client";

import { useState } from "react";
import Link from "next/link";
import { PILLARS } from "@/lib/thrivar/model";

const ink = "#1f2933";
const accent = "#2b3a67";

const CX = 180;
const CY = 175;
const R = 110;

function point(i: number, value: number) {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / 6;
  const r = (R * value) / 100;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function ring(value: number) {
  return PILLARS.map((_, i) => {
    const p = point(i, value);
    return `${p.x},${p.y}`;
  }).join(" ");
}

export default function MapRadar({
  scores,
  states,
  previousScores,
}: {
  scores: Record<string, number>;
  states: Record<string, string>;
  previousScores?: Record<string, number> | null;
}) {
  const [selected, setSelected] = useState<string>(PILLARS[0].key);

  const polygon = PILLARS.map((p, i) => {
    const pt = point(i, scores[p.key] ?? 0);
    return `${pt.x},${pt.y}`;
  }).join(" ");

  const previousPolygon = previousScores
    ? PILLARS.map((p, i) => {
        const pt = point(i, previousScores[p.key] ?? 0);
        return `${pt.x},${pt.y}`;
      }).join(" ")
    : null;

  const current = PILLARS.find((p) => p.key === selected) ?? PILLARS[0];

  return (
    <div>
      <svg
        viewBox="0 0 360 350"
        role="img"
        aria-label="Your six dimensions as a hexagon chart"
        style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }}
      >
        {[25, 50, 75, 100].map((v) => (
          <polygon key={v} points={ring(v)} fill="none" stroke={ink} strokeOpacity={0.15} />
        ))}
        {PILLARS.map((_, i) => {
          const edge = point(i, 100);
          return <line key={i} x1={CX} y1={CY} x2={edge.x} y2={edge.y} stroke={ink} strokeOpacity={0.12} />;
        })}

        {previousPolygon && (
          <polygon
            points={previousPolygon}
            fill="none"
            stroke={accent}
            strokeOpacity={0.5}
            strokeDasharray="4 4"
          />
        )}
        <polygon points={polygon} fill={accent} fillOpacity={0.2} stroke={accent} strokeWidth={2} />

        {PILLARS.map((p, i) => {
          const pt = point(i, scores[p.key] ?? 0);
          const label = point(i, 128);
          const isSel = p.key === selected;
          const anchor = label.x < CX - 8 ? "end" : label.x > CX + 8 ? "start" : "middle";
          return (
            <g
              key={p.key}
              role="button"
              tabIndex={0}
              aria-label={`${p.label}, ${states[p.key] ?? ""}`}
              onClick={() => setSelected(p.key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(p.key)}
              style={{ cursor: "pointer", outline: "none" }}
            >
              <circle cx={pt.x} cy={pt.y} r={isSel ? 9 : 6} fill={accent} stroke="#faf6ef" strokeWidth={2} />
              <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />
              <text
                x={label.x}
                y={label.y + 4}
                textAnchor={anchor}
                fontSize={13}
                fill={ink}
                fontWeight={isSel ? 700 : 400}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          marginTop: 8,
          padding: "16px 18px",
          borderRadius: 16,
          background: `${accent}12`,
          color: ink,
        }}
      >
        <div style={{ fontFamily: "Georgia, serif", fontSize: 20 }}>
          {current.label} <span style={{ opacity: 0.6, fontSize: 15 }}>· {states[current.key] ?? ""}</span>
        </div>
        <p style={{ margin: "6px 0", lineHeight: 1.6 }}>{current.question}</p>
        <p style={{ margin: "6px 0", fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>
          {scores[current.key] ?? "-"} out of 100. This shows how true the statements about {current.label.toLowerCase()} felt
          to you. It is a mirror for reflection, not a measurement of who you are.
        </p>
        <Link href="/coach" style={{ color: accent, fontSize: 14 }}>
          Talk about {current.label.toLowerCase()} with your coach
        </Link>
      </div>
      {previousPolygon && (
        <p style={{ fontSize: 13, opacity: 0.65, marginTop: 8 }}>The dashed line shows where you started.</p>
      )}
    </div>
  );
}
