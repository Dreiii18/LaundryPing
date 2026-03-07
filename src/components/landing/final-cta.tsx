import Link from 'next/link';

export function FinalCta() {
  return (
    <section
      className="py-18 px-6"
      style={{
        background: '#0a2e2b',
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="max-w-[36rem] mx-auto text-center">
        <h2 className="text-[1.625rem] md:text-3xl font-bold text-white leading-tight tracking-tight">
          Stop Wasting Time Texting Customers!
        </h2>
        <p className="mt-3 text-[0.9375rem] text-white/60 leading-relaxed">
          LaundryPing automates SMS notifications so customers know exactly when to pick up. Simple, fast, stress-free.
        </p>
        <p className="mt-4 text-[0.9375rem] text-white/60 leading-relaxed">
          No more manual follow-ups.{' '}
          <span className="text-white/80 font-medium">Automate SMS alerts for every customer.</span>
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 mt-7 bg-[#2dd4bf] hover:bg-[#26bfa9] text-[#111817] font-bold text-base rounded-xl px-8 py-3 transition-colors"
        >
          Start Automating SMS
        </Link>
        <p className="mt-3 text-[0.8125rem] text-white/40">
          50 free SMS per month. Top-up packs start at ₱299.
        </p>
      </div>
    </section>
  );
}
