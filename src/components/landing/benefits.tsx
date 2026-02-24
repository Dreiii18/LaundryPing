import { MessageSquare, Gift } from 'lucide-react';

export function Benefits() {
  return (
    <section className="px-6 pb-16 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 — Brand-filled (dark) */}
        <div className="bg-[#0d968b] text-white rounded-2xl p-8">
          <div className="size-12 rounded-lg bg-white/15 flex items-center justify-center mb-4">
            <MessageSquare className="size-6 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-2">
            SMS lang — walang app
          </h3>
          <p className="text-white/80 text-sm leading-relaxed">
            May text agad ang customer mo kapag tapos na ang labada nila.
            Gumagana sa lahat ng phone — hindi kailangan mag-install ng kahit ano.
          </p>
        </div>

        {/* Card 2 — White (neutral) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm transition-shadow hover:shadow-md">
          <div className="size-12 rounded-lg bg-[#0d968b]/10 flex items-center justify-center mb-4">
            <Gift className="size-6 text-[#0d968b]" />
          </div>
          <h3 className="text-lg font-bold text-[#111817] mb-2">
            200 libreng SMS bawat buwan
          </h3>
          <p className="text-[#618986] text-sm leading-relaxed">
            Magsimula gamit ang free tier. Walang credit card na kailangan.
            Set up sa ilang minuto lang — walang training needed.
          </p>
        </div>
      </div>
    </section>
  );
}
