import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardWithTrendProps {
  label: string;
  value: string;
  previousValue: number;
  previousLabel: string;
  currentNumericValue: number;
}

function TrendBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous > 0) {
    const pctChange = Math.round(((current - previous) / previous) * 100);
    if (pctChange > 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 mb-1">
          <TrendingUp className="size-3.5" aria-hidden="true" />
          +{pctChange}%
        </span>
      );
    }
    if (pctChange < 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500 mb-1">
          <TrendingDown className="size-3.5" aria-hidden="true" />
          {pctChange}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-400 mb-1">
        <Minus className="size-3.5" aria-hidden="true" />
        0%
      </span>
    );
  }

  if (current > 0 && previous === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 mb-1">
        <TrendingUp className="size-3.5" aria-hidden="true" />
        New
      </span>
    );
  }

  return null;
}

export function StatCardWithTrend({
  label,
  value,
  previousValue,
  previousLabel,
  currentNumericValue,
}: StatCardWithTrendProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <p className="text-4xl font-bold text-slate-900">{value}</p>
        <TrendBadge current={currentNumericValue} previous={previousValue} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{previousLabel}</p>
    </div>
  );
}
