"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-aubergine/25 bg-white text-base text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/40";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-3xl text-aubergine mb-4">Almost there</h1>
          <p className="text-ink/75 leading-relaxed">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Follow it to
            finish creating your account.
          </p>
        </div>
      </main>
    );
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

        <h1 className="font-display text-3xl text-aubergine mb-2">Create your account</h1>
        <p className="text-sm text-ink/70 mb-8">
          Already have one?{" "}
          <Link href="/login" className="underline underline-offset-4 text-aubergine">
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSignup}>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mb-2`}
          />
          <p className="text-xs text-ink/60 mb-6">At least 8 characters.</p>

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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
