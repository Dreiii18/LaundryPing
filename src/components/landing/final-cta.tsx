import Link from 'next/link';

export function FinalCta() {
  return (
    <section className="px-6 pb-24">
      <div
        className="relative max-w-4xl mx-auto bg-[#0a2e2b] rounded-2xl py-16 px-6 text-center overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <h2 className="relative text-2xl md:text-3xl font-bold text-white mb-4">
          Simulan ang SMS notifications ngayon
        </h2>
        <p className="relative text-white/50 mb-8 max-w-md mx-auto">
          Walang lock-in. Simula sa ₱299/buwan para sa 300 SMS.
        </p>
        <Link
          href="/signup"
          className="relative inline-block bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-base rounded-lg h-11 px-8 leading-11 transition-colors"
        >
          Create Account
        </Link>
      </div>
    </section>
  );
}
