import Link from 'next/link';
import { WashingMachine } from 'lucide-react';

export function Hero() {
  return (
    <section className="px-6 pt-20 pb-28 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left column — Text */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-[#111817] leading-tight tracking-tight">
            I-text ang customer mo kapag tapos na ang labada
          </h1>
          <p className="mt-6 text-lg text-[#618986] leading-relaxed">
            Awtomatikong SMS notification para sa mga customer mo pagkatapos ng
            laundry. Simple, mabilis, at gawa para sa laundromat sa Pilipinas.
          </p>
          <Link
            href="/signup"
            className="inline-block mt-8 bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-base rounded-lg h-11 px-8 leading-11 transition-colors"
          >
            Get Started Free
          </Link>
          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 mt-6 text-sm text-[#618986]">
            <span className="flex items-center gap-1.5">
              <span className="text-[#0d968b] font-bold">✓</span>
              Walang credit card
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#0d968b] font-bold">✓</span>
              200 libreng SMS/buwan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#0d968b] font-bold">✓</span>
              Setup in 2 minutes
            </span>
          </div>
        </div>

        {/* Right column — Floating SMS card */}
        <div className="flex justify-center md:justify-end" aria-hidden="true">
          <div className="relative">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[#0d968b]/5 blur-xl rounded-full scale-110" />

            {/* Main SMS notification card */}
            <div className="relative animate-sms-slide-in">
              <div className="bg-white border border-[#0d968b]/15 rounded-2xl p-5 shadow-xl max-w-75">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-8 rounded-full bg-[#0d968b] flex items-center justify-center">
                    <WashingMachine className="size-4 text-white" />
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
                  Tapos na ang labada mo sa <span className="font-semibold">Washer 3</span>. Paki-pickup na po. Salamat sa <span className="font-semibold">QuickClean Laundromat</span>!
                </p>
                <p className="text-[10px] text-[#618986] mt-2">
                  via Semaphore SMS
                </p>
              </div>
            </div>

            {/* Stacked faded SMS cards for depth */}
            <div className="relative mt-3 space-y-2.5 opacity-40">
              <div className="bg-white rounded-xl p-4 border border-gray-100 scale-[0.97] origin-top">
                <p className="text-xs text-[#111817]/60 leading-relaxed">
                  Tapos na — Washer 1. Paki-pickup na po.
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 scale-[0.97] origin-top">
                <p className="text-xs text-[#111817]/60 leading-relaxed">
                  Tapos na — Dryer 2. Salamat!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
