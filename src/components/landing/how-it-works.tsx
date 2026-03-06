import { WashingMachine, Play, MessageSquare } from 'lucide-react';
import { DemoVideoModal } from './demo-video-modal';

export function HowItWorks() {
  return (
    <section className="bg-[#0d968b]/[0.07] py-18 border-t border-black/[0.06]">
      <div className="px-6 max-w-[68rem] mx-auto">
        <div className="max-w-md mb-12 text-center md:text-left">
          <span className="uppercase tracking-widest text-[11px] text-[#0d968b] font-semibold">
            HOW IT WORKS
          </span>
          <h2 className="text-[1.625rem] font-bold text-[#111817] mt-2 leading-tight tracking-tight">
            Paano gumagana?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center md:px-6 relative">
            <div className="size-14 rounded-2xl bg-[#0d968b] flex items-center justify-center mb-5 shadow-lg shadow-[#0d968b]/20">
              <WashingMachine className="size-6 text-white" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#0d968b] mb-1.5">
              Step 1
            </span>
            <h3 className="text-[0.9375rem] font-semibold text-[#111817] mb-2 tracking-tight">
              I-register ang machine
            </h3>
            <p className="text-[0.8125rem] text-[#618986] leading-relaxed max-w-[260px]">
              Idagdag ang mga washer at dryer mo sa dashboard. Isang beses lang.
            </p>
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] border-t-2 border-dashed border-[#0d968b]/20" />
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center md:px-6 relative">
            <div className="size-14 rounded-2xl bg-[#0d968b] flex items-center justify-center mb-5 shadow-lg shadow-[#0d968b]/20">
              <Play className="size-6 text-white" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#0d968b] mb-1.5">
              Step 2
            </span>
            <h3 className="text-[0.9375rem] font-semibold text-[#111817] mb-2 tracking-tight">
              Simulan ang job
            </h3>
            <p className="text-[0.8125rem] text-[#618986] leading-relaxed max-w-[260px]">
              I-click ang &quot;Start Job&quot; kapag may bagong customer. I-enter ang phone number.
            </p>
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] border-t-2 border-dashed border-[#0d968b]/20" />
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center md:px-6">
            <div className="size-14 rounded-2xl bg-[#0d968b] flex items-center justify-center mb-5 shadow-lg shadow-[#0d968b]/20">
              <MessageSquare className="size-6 text-white" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#0d968b] mb-1.5">
              Step 3
            </span>
            <h3 className="text-[0.9375rem] font-semibold text-[#111817] mb-2 tracking-tight">
              Auto-send SMS
            </h3>
            <p className="text-[0.8125rem] text-[#618986] leading-relaxed max-w-[260px]">
              Kapag tapos na, automatic na SMS ang mapupunta sa customer. Done!
            </p>
          </div>
        </div>

        {/* Watch Demo button */}
        <div className="flex justify-center mt-12">
          <DemoVideoModal />
        </div>
      </div>
    </section>
  );
}
