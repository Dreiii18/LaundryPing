'use client';

import { Label } from '@/components/ui/label';
import { Minus, Plus } from 'lucide-react';

interface ServiceSelectorProps {
  availableServices: string[];
  selectedServices: string[];
  onToggle: (service: string) => void;
  serviceQuantities: Record<string, number>;
  onQuantityChange: (service: string, qty: number) => void;
}

export function ServiceSelector({
  availableServices,
  selectedServices,
  onToggle,
  serviceQuantities,
  onQuantityChange,
}: ServiceSelectorProps) {
  if (availableServices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold text-[#111817]">Services</Label>
      <div className="flex flex-wrap gap-1.5">
        {availableServices.map((service) => {
          const isSelected = selectedServices.includes(service);
          const qty = serviceQuantities[service] || 1;

          if (!isSelected) {
            return (
              <button
                key={service}
                type="button"
                onClick={() => onToggle(service)}
                className="py-1.5 px-3 rounded-lg text-sm font-semibold border transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              >
                {service}
              </button>
            );
          }

          return (
            <div
              key={service}
              className="flex items-center rounded-lg border border-[#0d968b] bg-[#0d968b]/10 transition-all"
            >
              <button
                type="button"
                onClick={() => onToggle(service)}
                className="py-1.5 pl-3 pr-1.5 text-sm font-semibold text-[#0d968b] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 rounded-l-lg"
              >
                {service}
              </button>
              <div className="flex items-center gap-0.5 pr-1.5">
                <button
                  type="button"
                  onClick={() => onQuantityChange(service, qty - 1)}
                  disabled={qty <= 1}
                  className="size-6 flex items-center justify-center rounded-md text-[#0d968b]/70 hover:bg-[#0d968b]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={`Decrease ${service} quantity`}
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-5 text-center text-xs font-bold text-[#0d968b]">{qty}</span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(service, qty + 1)}
                  disabled={qty >= 10}
                  className="size-6 flex items-center justify-center rounded-md text-[#0d968b]/70 hover:bg-[#0d968b]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={`Increase ${service} quantity`}
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
