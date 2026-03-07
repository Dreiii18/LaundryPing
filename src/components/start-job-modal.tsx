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
import { Input } from '@/components/ui/input';
import { Loader2, Play, Droplets, Wind, AlertTriangle, XCircle } from 'lucide-react';
import { PhoneInput } from '@/components/phone-input';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { isValidPhNumber } from '@/lib/utils/phone';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

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
  const [isPaid, setIsPaid] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notifySms, setNotifySms] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setMachineId('');
      setPhone('');
      setNotes('');
      setIsPaid(true);
      setPayAmount('');
      setPaymentMethod('');
      setNotifySms(true);
      setError('');
      setTotalCredits(null);
      fetchMachines();
      fetchSmsCredits();
    }
  }, [open]);

  const fetchMachines = async () => {
    setLoadingMachines(true);
    try {
      // Fetch machines
      const machinesRes = await fetchWithAuth('/api/machines');
      const machinesData = await machinesRes.json();

      // Fetch jobs to find machines with active jobs
      const jobsRes = await fetchWithAuth('/api/jobs');
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

  const fetchSmsCredits = async () => {
    try {
      const res = await fetchWithAuth('/api/sms/usage');
      if (res.ok) {
        const data = await res.json();
        setTotalCredits(data.totalCredits ?? 0);
      }
    } catch {
      // Non-blocking — silently ignore failures
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!machineId) {
      setError('Please select a machine');
      return;
    }

    if (notifySms) {
      if (!phone.trim()) {
        setError('Phone number is required');
        return;
      }

      const phoneClean = phone.replace(/[\s\-()]/g, '');
      if (!isValidPhNumber(phoneClean)) {
        setError('Please enter a valid Philippine mobile number (e.g., 09171234567)');
        return;
      }
    }

    if (!payAmount.trim() || isNaN(Number(payAmount)) || Number(payAmount) < 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (isPaid && !paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      const phoneClean = phone.replace(/[\s\-()]/g, '');
      const res = await fetchWithAuth('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId,
          ...(notifySms && phoneClean ? { phone: phoneClean } : {}),
          notify_sms: notifySms,
          notes: notes.trim() || undefined,
          is_paid: isPaid,
          pay_amount: Number(payAmount),
          payment_method: isPaid ? paymentMethod : undefined,
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
      <DialogContent className="sm:max-w-130 p-0 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d968b]" />

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4 shrink-0">
            <DialogTitle className="text-2xl font-bold text-[#111817]">
              Start New Job
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              Assign a machine and customer details.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-3 space-y-4 sm:px-8 sm:py-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* SMS credit warnings */}
            {totalCredits !== null && (() => {
              if (totalCredits === 0) {
                return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                    <XCircle className="size-4 text-red-600 shrink-0" />
                    <span className="text-red-700">No SMS credits. Job will be tracked but no SMS will be sent.</span>
                  </div>
                );
              }
              if (totalCredits <= 10) {
                return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span className="text-amber-700">Low SMS credits: {totalCredits} credit{totalCredits !== 1 ? 's' : ''} remaining.</span>
                  </div>
                );
              }
              return null;
            })()}

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
                  <SelectTrigger id="machine-select" className="w-full h-12 min-h-11">
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

            {/* SMS Notification Toggle + Phone Number */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">SMS Notification</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNotifySms(true)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                    notifySms
                      ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  Notify via SMS
                </button>
                <button
                  type="button"
                  onClick={() => { setNotifySms(false); setPhone(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                    !notifySms
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  No SMS
                </button>
              </div>
            </div>

            {notifySms && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-[#111817]">Phone Number</Label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  disabled={loading}
                />
              </div>
            )}

            {/* Pay Amount */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="pay-amount" className="text-sm font-semibold text-[#111817]">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₱</span>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  disabled={loading}
                  className="pl-7 h-12"
                />
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">Payment Status</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsPaid(true); setPaymentMethod(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                    isPaid
                      ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => { setIsPaid(false); setPaymentMethod(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                    !isPaid
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  Pay Later
                </button>
              </div>
            </div>

            {/* Payment Method — only when Paid */}
            {isPaid && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="payment-method" className="text-sm font-semibold text-[#111817]">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" className="w-full h-12 min-h-11">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">Notes (Optional)</Label>
              <Textarea
                placeholder="e.g., Extra spin, delicate wash, low heat dryer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="min-h-16 sm:min-h-25 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-5 pb-5 pt-3 sm:px-8 sm:pb-8 sm:pt-4 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || machines.length === 0}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
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
