import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="px-6 pt-20 pb-28 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left column — Text */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#111817] leading-tight tracking-tight">
            Stop Wasting Time Texting Customers!
          </h1>
          <p className="mt-5 text-lg text-[#618986] leading-relaxed max-w-[540px]">
            LaundryPing automates SMS notifications so customers know exactly
            when to pick up. Simple, fast, stress-free.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2dd4bf] hover:bg-[#26bfa9] text-[#111817] font-bold text-base rounded-xl px-8 py-3 transition-colors"
            >
              Start Free
            </Link>
            <a
              href="https://calendly.com/official-laundryping/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-transparent text-[#618986] font-semibold text-[0.9375rem] px-7 py-3 rounded-xl border border-[#0d968b] hover:bg-[#0d968b]/10 hover:text-[#0d968b] transition-colors"
            >
              Book a Demo
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 mt-5 text-[0.8125rem] text-[#618986]">
            <span className="flex items-center gap-1.5">
              <span className="text-[#0d968b] font-bold">&#10003;</span>
              50 free SMS/month
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#0d968b] font-bold">&#10003;</span>
              Setup in 2 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#0d968b] font-bold">&#10003;</span>
              No app needed
            </span>
          </div>
        </div>

        {/* Right column — Floating SMS card */}
        <div className="flex justify-center md:justify-end" aria-hidden="true">
          <div className="relative">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[#2dd4bf]/8 blur-[30px] rounded-full scale-115" />

            {/* Main SMS notification card */}
            <div className="relative animate-sms-slide-in">
              <div className="bg-white border border-[#0d968b]/15 rounded-2xl p-5 shadow-xl max-w-[340px]">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-8 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src="/laundryping-icon.png"
                      alt="LaundryPing"
                      width={96}
                      height={96}
                      className="size-8 object-cover"
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#111817]">
                    LaundryPing
                  </span>
                  <span className="text-[10px] text-[#618986] ml-auto">
                    Received now
                  </span>
                  {/* Green pulse dot */}
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0d968b] opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-[#0d968b]" />
                  </span>
                </div>
                <p className="text-sm text-[#111817]/80 leading-relaxed">
                  Tapos na po ang labada mo sa{' '}
                  <span className="font-semibold">QuickClean Laundromat</span>.
                  Ready na po for pickup. Salamat sa pagtitiwala!
                </p>
              </div>
            </div>

            {/* Stacked faded SMS cards for depth */}
            <div className="relative mt-3 space-y-2.5 opacity-40">
              <div className="bg-white rounded-xl p-4 border border-gray-100 scale-[0.97] origin-top max-w-[340px]">
                <p className="text-xs text-[#111817]/60 leading-relaxed">
                  Hi! Tapos na po ang labada mo sa FreshSpin. Pwede na po itong i-pickup. Salamat!
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 scale-[0.97] origin-top max-w-[340px]">
                <p className="text-xs text-[#111817]/60 leading-relaxed">
                  Update mula sa BrightWash: Tapos na po ang labada mo at ready na for pickup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
