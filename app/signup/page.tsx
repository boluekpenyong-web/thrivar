"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
          <h1 className="font-display text-3xl text-cobalt mb-4">Almost there</h1>
          <p className="text-ink/70">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Follow it to finish creating your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6">
      <form onSubmit={handleSignup} className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-cobalt mb-2">Create your account</h1>
        <p className="text-sm text-ink/60 mb-8">
          Already have one?{" "}
          <Link href="/login" className="underline text-cobalt">
            Log in
          </Link>
        </p>

        <label className="block text-sm text-ink/60 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-5 px-4 py-3 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
        />

        <label className="block text-sm text-ink/60 mb-1">Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-3 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-full bg-cobalt text-cream text-sm disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
