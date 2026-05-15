'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchWithAuth } from '@/lib/utils/fetch';

type MachineType = 'washer' | 'dryer' | 'combo';

interface StepAddMachineProps {
  onContinue: () => void;
}

const TYPE_OPTIONS: { value: MachineType; label: string; defaultLabel: string }[] = [
  { value: 'washer', label: 'Washer', defaultLabel: 'W1' },
  { value: 'dryer', label: 'Dryer', defaultLabel: 'D1' },
  { value: 'combo', label: 'Combo', defaultLabel: 'C1' },
];

export function StepAddMachine({ onContinue }: StepAddMachineProps) {
  const [machineType, setMachineType] = useState<MachineType>('washer');
  const [label, setLabel] = useState('W1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleTypeChange(next: MachineType) {
    const prevDefault = TYPE_OPTIONS.find((o) => o.value === machineType)?.defaultLabel;
    const nextDefault = TYPE_OPTIONS.find((o) => o.value === next)!.defaultLabel;
    // Auto-update the label only if the user hasn't customised it.
    if (label === '' || label === prevDefault) {
      setLabel(nextDefault);
    }
    setMachineType(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = label.trim();
    if (!trimmed) {
      setError('Machine label is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed, machine_type: machineType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not add machine');
        setSaving(false);
        return;
      }

      onContinue();
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#111817]">Add your first machine</h3>
        <p className="text-sm text-[#618986] mt-1">
          You can add more later in the Machines page.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-[#111817]">Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTypeChange(opt.value)}
              disabled={saving}
              className={cn(
                'py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors min-h-11',
                machineType === opt.value
                  ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="machine_label" className="text-sm font-semibold text-[#111817]">
          Label
        </Label>
        <Input
          id="machine_label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. W1"
          maxLength={20}
          disabled={saving}
          className="h-11"
        />
        <p className="text-xs text-slate-400">Short name your staff will see when starting jobs.</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              Add machine
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
