import Link from 'next/link';

const packs = [
  {
    name: '250 SMS Pack',
    price: '₱299',
    perSms: '₱1.20 / SMS',
    badge: null,
    featured: false,
  },
  {
    name: '600 SMS Pack',
    price: '₱699',
    perSms: '₱1.17 / SMS',
    badge: 'Most Popular',
    featured: true,
  },
  {
    name: '1,100 SMS Pack',
    price: '₱1,199',
    perSms: '₱1.09 / SMS',
    badge: 'Best Value',
    featured: false,
  },
];

export function Pricing() {
  return (
    <section className="py-18 bg-[#0d968b]/[0.07] border-t border-black/[0.06]">
      <div className="px-6 max-w-[68rem] mx-auto">
        <div className="max-w-md mb-12 text-center md:text-left">
          <span className="uppercase tracking-widest text-[11px] text-[#0d968b] font-semibold">
            PRICING
          </span>
          <h2 className="text-[1.625rem] font-bold text-[#111817] mt-2 leading-tight tracking-tight">
            Abot-kayang presyo
          </h2>
          <p className="mt-3 text-[0.9375rem] text-[#618986] leading-relaxed">
            Subscribe and cancel anytime — no lock-in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {packs.map((pack) => (
            <div
              key={pack.name}
              className={`relative bg-white rounded-[0.875rem] p-8 transition-shadow hover:shadow-lg ${
                pack.featured
                  ? 'border-2 border-[#0d968b] shadow-lg shadow-[#0d968b]/10 md:scale-[1.02]'
                  : 'border border-black/[0.06]'
              }`}
            >
              {pack.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-wide px-3 py-1 rounded-full whitespace-nowrap ${
                    pack.featured
                      ? 'bg-[#0d968b] text-white'
                      : 'bg-[#0d968b]/10 text-[#0d968b]'
                  }`}
                >
                  {pack.badge}
                </span>
              )}
              <div className="text-[11px] font-semibold tracking-wider text-[#0d968b] uppercase mb-4">
                {pack.name}
              </div>
              <div className="text-2xl font-bold text-[#111817] tracking-tight leading-tight">
                {pack.price}
              </div>
              <div className="text-xs text-[#94a3b8] mt-1">{pack.perSms}</div>
              <div className="text-[0.8125rem] text-[#618986] mt-1.5">
                One-time top-up
              </div>
              <Link
                href="/signup"
                className="inline-block mt-4 text-[0.8125rem] font-semibold text-[#0d968b] hover:underline"
              >
                Mag-top up &rarr;
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center mt-6 text-[0.8125rem] text-[#618986]">
          50 free SMS/month included with every account.
        </p>
      </div>
    </section>
  );
}
