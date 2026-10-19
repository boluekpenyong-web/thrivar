"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="mb-6 mt-2">
      <p className="mb-4 leading-relaxed text-ink/75">
        Your Transformation Map has not been created yet.
      </p>
      <button
        onClick={generate}
        disabled={loading}
        className="rounded-lg bg-aubergine px-6 py-3 text-base text-cream transition-colors hover:bg-plum disabled:opacity-60"
      >
        {loading ? "Reading your landscape..." : "Generate my map"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
