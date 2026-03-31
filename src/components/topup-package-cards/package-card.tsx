import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

interface Package {
  slug: string;
  label: string;
  sms_credits: number;
  price_php: number;
  description: string | null;
}

interface PackageCardProps {
  pkg: Package;
}

export function PackageCard({ pkg }: PackageCardProps) {
  const isMostPopular = pkg.slug === 'pack-600';
  const isBestValue = pkg.slug === 'pack-1100';
  const isHighlighted = isMostPopular || isBestValue;

  return (
    <div
      className={`relative rounded-xl border p-6 transition-shadow ${
        isHighlighted
          ? 'border-[#0d968b]/40 shadow-md hover:shadow-lg'
          : 'border-slate-200 hover:shadow-md'
      }`}
    >
      {isMostPopular && (
        <Badge className="absolute -top-2.5 left-4 bg-[#0d968b] text-white text-[10px] font-bold uppercase">
          Most Popular
        </Badge>
      )}
      {isBestValue && (
        <Badge className="absolute -top-2.5 left-4 bg-amber-500 text-white text-[10px] font-bold uppercase">
          Best Value
        </Badge>
      )}

      <div className="mb-4">
        <h4 className="text-lg font-bold text-slate-900">{pkg.label}</h4>
        {pkg.description && (
          <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
        )}
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-slate-900">₱{pkg.price_php}</span>
        <span className="text-sm text-slate-500"> one-time</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-700">
        <MessageSquare className="size-4 text-[#0d968b]" aria-hidden="true" />
        <span className="font-semibold">{pkg.sms_credits.toLocaleString()}</span>
        <span className="text-slate-500">SMS credits</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">Credits never expire</p>
    </div>
  );
}
