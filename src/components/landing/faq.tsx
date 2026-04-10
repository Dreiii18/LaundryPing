'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FAQ_ITEMS } from '@/components/landing/faq-data';

const midpoint = Math.ceil(FAQ_ITEMS.length / 2);
const LEFT_COLUMN = FAQ_ITEMS.slice(0, midpoint);
const RIGHT_COLUMN = FAQ_ITEMS.slice(midpoint);

function FaqItem({ item }: { item: { question: string; answer: string } }) {
  return (
    <details className="group bg-white rounded-xl border border-black/[0.06] overflow-hidden">
      <summary className="flex items-center justify-between cursor-pointer px-5 py-[1.125rem] text-[0.9375rem] font-semibold text-[#111817] leading-snug tracking-tight select-none list-none [&::-webkit-details-marker]:hidden">
        {item.question}
        <ChevronDown className="size-5 shrink-0 text-[#94a3b8] ml-4 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-[1.125rem] text-sm text-[#618986] leading-relaxed">
        {item.answer}
      </div>
    </details>
  );
}

export function Faq() {
  const [showAll, setShowAll] = useState(false);

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

        {/* Mobile: single column with show more */}
        <div className="space-y-3 md:hidden">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={item.question}
              className={index >= 6 && !showAll ? 'hidden' : ''}
            >
              <FaqItem item={item} />
            </div>
          ))}
        </div>

        {/* Desktop: two independent columns */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-3 md:items-start">
          <div className="space-y-3">
            {LEFT_COLUMN.map((item) => (
              <FaqItem key={item.question} item={item} />
            ))}
          </div>
          <div className="space-y-3">
            {RIGHT_COLUMN.map((item) => (
              <FaqItem key={item.question} item={item} />
            ))}
          </div>
        </div>

        <div className="mt-6 text-center md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? 'Show less' : 'Show more'}
          </Button>
        </div>
      </div>
    </section>
  );
}
