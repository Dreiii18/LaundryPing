'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Play, Droplets, Wind } from 'lucide-react';
import { PhoneInput } from '@/components/phone-input';
import { isValidPhNumber } from '@/lib/utils/phone';

interface Machine {
  id: string;
  label: string;
  type: string;
}

interface StartJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartJobModal({ open, onOpenChange }: StartJobModalProps) {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);

  useEffect(() => {
    if (open) {
      setMachineId('');
      setPhone('');
      setNotes('');
      setError('');
      fetchMachines();
    }
  }, [open]);

  const fetchMachines = async () => {
    setLoadingMachines(true);
    try {
      // Fetch machines
      const machinesRes = await fetch('/api/machines');
      const machinesData = await machinesRes.json();

      // Fetch jobs to find machines with active jobs
      const jobsRes = await fetch('/api/jobs');
      const jobsData = await jobsRes.json();

      const activeMachineIds = new Set(
        (jobsData.jobs || [])
          .filter((j: { status: string }) => j.status === 'in_progress')
          .map((j: { machine_id: string }) => j.machine_id)
      );

      // Filter to only available machines
      const available = (machinesData.machines || []).filter(
        (m: Machine) => !activeMachineIds.has(m.id)
      );

      setMachines(available);
    } catch {
      setError('Failed to load machines');
    } finally {
      setLoadingMachines(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!machineId) {
      setError('Please select a machine');
      return;
    }

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    const phoneClean = phone.replace(/[\s\-()]/g, '');
    if (!isValidPhNumber(phoneClean)) {
      setError('Please enter a valid Philippine mobile number (e.g., 09171234567)');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId,
          phone: phoneClean,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start job');
        setLoading(false);
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d968b]" />

        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-2xl font-bold text-[#111817]">
              Start New Job
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              Assign a machine and customer details.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-4 space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Machine Selection */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="machine-select" className="text-sm font-semibold text-[#111817]">Machine</Label>
              {loadingMachines ? (
                <div className="h-12 flex items-center text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Loading machines...
                </div>
              ) : machines.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  No available machines. All machines are currently in use or none have been configured.
                </div>
              ) : (
                <Select value={machineId} onValueChange={setMachineId}>
                  <SelectTrigger id="machine-select" className="w-full h-12 min-h-[44px]">
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          {m.type === 'washer' ? (
                            <Droplets className="size-4 text-blue-500" />
                          ) : (
                            <Wind className="size-4 text-orange-500" />
                          )}
                          <span>{m.label}</span>
                          <span className="text-slate-400 capitalize">({m.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">Phone Number</Label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">Notes (Optional)</Label>
              <Textarea
                placeholder="e.g., Extra spin, delicate wash, low heat dryer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-8 pb-8 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || machines.length === 0}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Job
                  <Play className="size-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
