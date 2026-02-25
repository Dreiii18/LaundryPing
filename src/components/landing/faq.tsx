import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'Kailangan ba ng smartphone ang customer?',
    answer:
      'Hindi. SMS lang ang ginagamit, kaya gumagana sa lahat ng phone \u2014 mapa-smartphone o basic phone.',
  },
  {
    question: 'Magkano ang LaundryPing?',
    answer:
      'May tatlong plan: Starter (₱299/buwan, 300 SMS), Growth (₱539/buwan, 600 SMS), at Scale (₱959/buwan, 1,200 SMS). Piliin ang plan na bagay sa laki ng laundromat mo.',
  },
  {
    question: 'Gaano kabilis ang setup?',
    answer:
      'Ilang minuto lang. I-register ang mga machine mo at pwede ka nang mag-start ng mga job.',
  },
  {
    question: 'Paano kung naubos ang SMS ko?',
    answer:
      'Pwede kang mag-upgrade sa mas mataas na plan anytime. Hindi mawawala ang data mo.',
  },
];

export function Faq() {
  return (
    <section className="px-6 pb-20 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <span className="uppercase tracking-widest text-xs text-[#0d968b] font-medium">
          FAQ
        </span>
        <h2 className="text-2xl font-bold text-[#111817] mt-2">
          Mga madalas itanong
        </h2>
      </div>
      <div className="space-y-4">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group bg-white rounded-xl border border-gray-100 overflow-hidden transition-colors open:bg-[#0d968b]/3"
          >
            <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-[#111817] font-semibold text-sm select-none list-none [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown className="size-4 shrink-0 text-[#618986] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-5 text-sm text-[#618986] leading-relaxed border-t border-gray-100 pt-3">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
