import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import IntelligenceCard from "@/components/IntelligenceCard";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight";

const primary = `inline-block rounded-md bg-midnight px-8 py-3.5 text-center text-sm text-ivory transition-colors hover:bg-plum ${focusRing}`;
const secondary = `inline-block rounded-md border border-midnight/30 px-8 py-3.5 text-center text-sm text-midnight transition-colors hover:bg-tonal ${focusRing}`;

const sections = [
  { title: "6 Dimensions", body: "One honest picture of your life." },
  { title: "Your Path", body: "A transformation journey built around what you need next." },
];

export default async function Landing() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user;

  return (
    <main className="flex min-h-screen flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-[1040px] items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-xl tracking-[0.18em] text-midnight">THRIVAR</span>
        <Link
          href={signedIn ? "/home" : "/login"}
          className={`text-sm text-midnight underline-offset-4 hover:underline ${focusRing}`}
        >
          {signedIn ? "Open THRIVAR" : "Sign in"}
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
        <h1 className="max-w-2xl font-display text-4xl leading-[1.15] text-midnight sm:text-5xl">
          The intelligence behind your becoming.
        </h1>
        <span className="mt-8 block h-px w-12 bg-champagne" aria-hidden="true" />
        <p className="mt-6 max-w-md text-lg leading-relaxed text-mineral-deep">
          Your life is connected. Your growth should be, too.
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          {signedIn ? (
            <Link href="/home" className={primary}>
              Continue to your home
            </Link>
          ) : (
            <>
              <Link href="/signup" className={primary}>
                Create your account
              </Link>
              <Link href="/login" className={secondary}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="bg-midnight px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto grid max-w-[1040px] items-center gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s.title} className="border-t border-champagne/40 pt-6">
                <h2 className="font-display text-xl text-ivory">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ivory/75">{s.body}</p>
              </div>
            ))}
          </div>
          <IntelligenceCard />
        </div>
      </section>
    </main>
  );
}
