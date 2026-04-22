'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Flame } from 'lucide-react';
import { ServiceSelector } from './service-selector';
import type { Machine } from './types';

interface StepJobDetailsProps {
  error: string;
  availableServices: string[];
  selectedServices: string[];
  onToggle: (service: string) => void;
  serviceQuantities: Record<string, number>;
  onQuantityChange: (service: string, qty: number) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  loadingMachines: boolean;
  machines: Machine[];
  machineId: string;
  onMachineChange: (id: string) => void;
  totalWeight: number;
  priority: 'normal' | 'rush';
  onPriorityChange: (p: 'normal' | 'rush') => void;
  rushFeeAmount: number;
  loading: boolean;
}

export function StepJobDetails({
  error,
  availableServices,
  selectedServices,
  onToggle,
  serviceQuantities,
  onQuantityChange,
  totalWeight,
  customerName,
  onCustomerNameChange,
  loadingMachines,
  machines,
  machineId,
  onMachineChange,
  priority,
  onPriorityChange,
  rushFeeAmount,
  loading,
}: StepJobDetailsProps) {
  return (
    <div className="px-5 py-3 space-y-4 sm:px-8 sm:py-4 sm:space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <ServiceSelector
        availableServices={availableServices}
        selectedServices={selectedServices}
        onToggle={onToggle}
        serviceQuantities={serviceQuantities}
        onQuantityChange={onQuantityChange}
      />

      {totalWeight > 0 && (
        <p className="text-xs text-slate-500 -mt-2">
          Total weight: {totalWeight.toFixed(1)} kg
        </p>
      )}

      {/* Customer Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-name" className="text-sm font-semibold text-[#111817]">Customer Name (Optional)</Label>
        <Input
          id="customer-name"
          type="text"
          placeholder="e.g., Juan Dela Cruz"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          maxLength={60}
          disabled={loading}
          className="h-12"
        />
      </div>

      {/* Machine Selection */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="machine-select" className="text-sm font-semibold text-[#111817]">Machine</Label>
        {loadingMachines ? (
          <div className="h-12 flex items-center text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin mr-2" />
            Loading machines...
          </div>
        ) : machines.length === 0 ? (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
            No available machines — job will be queued.
          </div>
        ) : (
          <Select value={machineId} onValueChange={onMachineChange}>
            <SelectTrigger id="machine-select" className="w-full h-12 min-h-11">
              <SelectValue placeholder="Select a machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Queue-specific: Priority */}
      {!machineId && !loadingMachines && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-semibold text-[#111817]">Priority</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPriorityChange('normal')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                priority === 'normal'
                  ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => onPriorityChange('rush')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-orange-400/30 ${
                priority === 'rush'
                  ? 'bg-orange-50 border-orange-400 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Flame className="size-3.5 inline mr-1" />
              Rush
            </button>
          </div>
          {priority === 'rush' && rushFeeAmount > 0 && (
            <p className="text-xs text-orange-600">
              +₱{rushFeeAmount.toFixed(2)} rush fee applied
            </p>
          )}
        </div>
      )}
    </div>
  );
}
