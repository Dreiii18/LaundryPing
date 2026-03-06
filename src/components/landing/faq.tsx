import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'Kailangan ba ng app ang customer?',
    answer:
      'Hindi. SMS lang ang ginagamit, kaya gumagana sa lahat ng phone.',
  },
  {
    question: 'Gaano kabilis ang setup?',
    answer:
      'Ilang minuto lang. I-register ang machines mo at pwede ka nang mag-start.',
  },
  {
    question: 'Pwede ba mag-upgrade?',
    answer:
      'Oo. Pwede kang mag-upgrade anytime. Hindi mawawala ang data mo.',
  },
];

export function Faq() {
  return (
    <section className="py-18 border-t border-black/[0.06]">
      <div className="px-6 max-w-[68rem] mx-auto">
        <div className="max-w-md mb-12 text-center md:text-left">
          <span className="uppercase tracking-widest text-[11px] text-[#0d968b] font-semibold">
            FAQ
          </span>
          <h2 className="text-[1.625rem] font-bold text-[#111817] mt-2 leading-tight tracking-tight">
            Mga madalas itanong
          </h2>
        </div>

        <div className="max-w-[40rem] mx-auto space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group bg-white rounded-xl border border-black/[0.06] overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-[1.125rem] text-[0.9375rem] font-semibold text-[#111817] leading-snug tracking-tight select-none list-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-5 shrink-0 text-[#94a3b8] ml-4 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-[1.125rem] text-sm text-[#618986] leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
