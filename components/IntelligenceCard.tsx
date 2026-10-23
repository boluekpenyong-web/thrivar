// The THRIVAR Intelligence card. Wording is fixed by the brand brief:
// use these two lines exactly, add nothing around them.
export default function IntelligenceCard() {
  return (
    <section
      aria-labelledby="thrivar-intelligence"
      className="rounded-md border border-champagne bg-ivory p-8 text-midnight sm:p-10"
    >
      <h2 id="thrivar-intelligence" className="font-display text-base tracking-[0.18em]">
        THRIVAR INTELLIGENCE
      </h2>
      <span className="my-5 block h-px w-10 bg-champagne" aria-hidden="true" />
      <p className="font-display text-xl leading-snug sm:text-2xl">
        An intelligence that connects what you discover, guides what you change, and builds on how you grow.
      </p>
    </section>
  );
}
