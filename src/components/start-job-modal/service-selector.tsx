'use client';

import { Label } from '@/components/ui/label';

interface ServiceSelectorProps {
  availableServices: string[];
  selectedServices: string[];
  onToggle: (service: string) => void;
}

export function ServiceSelector({
  availableServices,
  selectedServices,
  onToggle,
}: ServiceSelectorProps) {
  if (availableServices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold text-[#111817]">Services</Label>
      <div className="flex flex-wrap gap-2">
        {availableServices.map((service) => (
          <button
            key={service}
            type="button"
            onClick={() => onToggle(service)}
            className={`py-2 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
              selectedServices.includes(service)
                ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {service}
          </button>
        ))}
      </div>
    </div>
  );
}
