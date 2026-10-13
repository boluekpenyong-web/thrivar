"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const navy = "#2b3a67";

export default function GenerateMapButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          `${data.error ?? "Could not generate your map."}${data.detail ? " " + String(data.detail).slice(0, 200) : ""}`
        );
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ margin: "8px 0 24px" }}>
      <p style={{ opacity: 0.75, lineHeight: 1.6 }}>
        Your Transformation Map has not been created yet.
      </p>
      <button
        onClick={generate}
        disabled={loading}
        style={{
          padding: "12px 22px",
          borderRadius: 999,
          border: "none",
          background: navy,
          color: "#fff",
          fontSize: 16,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Reading your landscape..." : "Generate my map"}
      </button>
      {error && <p style={{ color: "#b3261e", marginTop: 12 }}>{error}</p>}
    </div>
  );
}
