"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-aubergine/25 bg-white text-base text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/40";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-block font-display text-xl tracking-[0.18em] text-aubergine mb-10"
        >
          THRIVAR
        </Link>

        <h1 className="font-display text-3xl text-aubergine mb-2">Welcome back</h1>
        <p className="text-sm text-ink/70 mb-8">
          New here?{" "}
          <Link href="/signup" className="underline underline-offset-4 text-aubergine">
            Create an account
          </Link>
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="email" className="block text-sm text-ink/70 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} mb-5`}
          />

          <label htmlFor="password" className="block text-sm text-ink/70 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mb-6`}
          />

          {error && (
            <p role="alert" className="text-sm text-red-700 mb-4">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-aubergine text-cream text-sm hover:bg-plum transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
