import { WashingMachine, Play, MessageSquare } from 'lucide-react';

export function HowItWorks() {
  return (
    <section className="bg-[#0d968b]/[0.07] py-16">
      <div className="px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="uppercase tracking-widest text-xs text-[#0d968b] font-medium">
            Tatlong hakbang
          </span>
          <h2 className="text-2xl font-bold text-[#111817] mt-2">
            Paano gumagana?
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center md:px-6 relative">
            <div className="size-14 rounded-2xl bg-[#0d968b] flex items-center justify-center mb-2 shadow-lg shadow-[#0d968b]/20">
              <WashingMachine className="size-6 text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#0d968b] font-medium mb-3">
              Step 1
            </span>
            <h3 className="text-base font-bold text-[#111817] mb-2">
              I-register ang machine
            </h3>
            <p className="text-sm text-[#618986] leading-relaxed">
              Ilagay ang mga washer at dryer mo sa system.
            </p>
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] border-t-2 border-dashed border-[#0d968b]/20" />
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center md:px-6 relative">
            <div className="size-14 rounded-2xl bg-[#0d968b] flex items-center justify-center mb-2 shadow-lg shadow-[#0d968b]/20">
              <Play className="size-6 text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#0d968b] font-medium mb-3">
              Step 2
            </span>
            <h3 className="text-base font-bold text-[#111817] mb-2">
              Simulan ang job
            </h3>
            <p className="text-sm text-[#618986] leading-relaxed">
              Piliin ang machine, ilagay ang phone number ng customer.
            </p>
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] border-t-2 border-dashed border-[#0d968b]/20" />
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center md:px-6">
            <div className="size-14 rounded-2xl bg-[#0d968b] flex items-center justify-center mb-2 shadow-lg shadow-[#0d968b]/20">
              <MessageSquare className="size-6 text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#0d968b] font-medium mb-3">
              Step 3
            </span>
            <h3 className="text-base font-bold text-[#111817] mb-2">
              Auto-send SMS
            </h3>
            <p className="text-sm text-[#618986] leading-relaxed">
              Kapag tapos na, may text agad ang customer mo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
