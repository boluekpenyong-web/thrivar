import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";

const pillars = [
  { title: "6 Dimensions", body: "One honest picture of your life." },
  {
    title: "Your Path",
    body: "A transformation journey built around what you need next.",
  },
  {
    title: "THRIVAR Intelligence",
    body: "An intelligence that knows your journey, connects the dots, and evolves with you.",
  },
];

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user;

  return (
    <main className="min-h-screen flex flex-col bg-cream">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-xl tracking-[0.18em] text-aubergine">
          THRIVAR
        </span>
        <Link
          href={signedIn ? "/home" : "/login"}
          className={`text-sm text-aubergine underline-offset-4 hover:underline ${focusRing}`}
        >
          {signedIn ? "Open THRIVAR" : "Sign in"}
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.15] text-aubergine max-w-3xl mb-8">
          THE OPERATING SYSTEM FOR THRIVING.
        </h1>

        <div className="w-12 h-px bg-champagne mb-8" aria-hidden="true" />

        <p className="max-w-md text-base leading-relaxed text-ink/80 mb-8">
          THRIVAR is a personal transformation system that brings your inner
          world, direction, decisions, and growth into one place.
        </p>

        <div className="text-base leading-relaxed text-ink/80 mb-10 space-y-1">
          <p>See where you are.</p>
          <p>Understand what&apos;s shaping you.</p>
          <p>Build where you&apos;re going.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          {signedIn ? (
            <Link
              href="/home"
              className={`px-8 py-3.5 rounded-lg bg-aubergine text-cream text-sm text-center hover:bg-plum transition-colors ${focusRing}`}
            >
              Continue to your home
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className={`px-8 py-3.5 rounded-lg bg-aubergine text-cream text-sm text-center hover:bg-plum transition-colors ${focusRing}`}
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className={`px-8 py-3.5 rounded-lg border border-aubergine/30 text-aubergine text-sm text-center hover:bg-greige transition-colors ${focusRing}`}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="px-8 py-16 bg-aubergine">
        <div className="max-w-md mx-auto divide-y divide-champagne/30">
          {pillars.map((item) => (
            <div key={item.title} className="py-6 text-center">
              <h2 className="font-display text-xl text-cream mb-2">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed text-cream/80">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
