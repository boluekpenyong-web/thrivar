import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-cobalt flex items-center justify-center mb-7">
        <span className="text-cream font-display text-2xl">T</span>
      </div>
      <h1 className="font-display text-6xl text-cobalt mb-4">Thrivar</h1>
      <p className="font-display italic text-xl text-ink mb-10">
        The operating system for becoming.
      </p>

      <div className="w-full max-w-md rounded-3xl bg-cobalt px-8 py-3 mb-10 divide-y divide-cream/20">
        {[
          { title: "6 Dimensions", body: "One honest picture of your life." },
          { title: "Your Path", body: "A transformation journey built around what you need next." },
          { title: "Thrive Intelligence", body: "An intelligence that knows your journey, connects the dots, and evolves with you." },
        ].map((item) => (
          <div key={item.title} className="py-6">
            <p className="font-display text-xl text-cream mb-2">{item.title}</p>
            <p className="text-sm leading-relaxed text-cream/75">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link href="/signup" className="px-8 py-3.5 rounded-full bg-cobalt text-cream text-sm">
          Let&apos;s begin
        </Link>
        <Link href="/login" className="px-8 py-3.5 rounded-full border border-cobalt/30 text-cobalt text-sm">
          Log in
        </Link>
      </div>
    </main>
  );
}
