import { ClipboardList, CheckCircle, MessageSquareOff } from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'No More Manual Coordination',
    description:
      'Forget whiteboards and group chats. One dashboard handles all your orders.',
  },
  {
    icon: CheckCircle,
    title: 'Every Order Organized',
    description:
      'See each order clearly from booking to completion. Nothing gets forgotten.',
  },
  {
    icon: MessageSquareOff,
    title: 'Less Follow-Up Messages',
    description:
      'Customers get automatic SMS. No more "Ready na ba?" messages in your inbox.',
  },
];

export function Features() {
  return (
    <section className="py-18 border-t border-black/[0.06]">
      <div className="px-6 max-w-[68rem] mx-auto">
        <div className="max-w-md mb-12 text-center md:text-left">
          <span className="uppercase tracking-widest text-[11px] text-[#0d968b] font-semibold">
            FEATURES
          </span>
          <h2 className="text-[1.625rem] font-bold text-[#111817] mt-2 leading-tight tracking-tight">
            Bakit LaundryPing?
          </h2>
          <p className="mt-3 text-[0.9375rem] text-[#618986] leading-relaxed">
            Perfect for pickup &amp; delivery services, multi-branch laundromats, and serious operators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.06] border border-black/[0.06] rounded-[0.875rem] overflow-hidden">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white p-8">
              <div className="size-10 rounded-[0.625rem] bg-[#0d968b]/10 flex items-center justify-center mb-4">
                <feature.icon className="size-5 text-[#0d968b]" />
              </div>
              <h3 className="text-[0.9375rem] font-semibold text-[#111817] mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-[0.8125rem] text-[#618986] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
