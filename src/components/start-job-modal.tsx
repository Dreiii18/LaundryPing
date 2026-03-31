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
import { Loader2, Play, Clock, AlertTriangle, XCircle } from 'lucide-react';
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
  const [customerName, setCustomerName] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notifySms, setNotifySms] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [priceManuallyChanged, setPriceManuallyChanged] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setMachineId('');
      setPhone('');
      setNotes('');
      setCustomerName('');
      setIsPaid(true);
      setPayAmount('');
      setPaymentMethod('');
      setNotifySms(true);
      setSelectedServices([]);
      setServicePrices({});
      setPriceManuallyChanged(false);
      setCashTendered('');
      setError('');
      setLoading(false);
      setTotalCredits(null);
      fetchMachines();
      fetchSmsCredits();
      fetchAvailableServices();
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
          .filter((j: { status: string; machine_id: string | null }) =>
            ['pending', 'in_progress'].includes(j.status) && j.machine_id
          )
          .map((j: { machine_id: string }) => j.machine_id)
      );

      const allMachines = machinesData.machines || [];

      // Filter to only available machines
      const available = allMachines.filter(
        (m: Machine) => !activeMachineIds.has(m.id)
      );

      setMachines(available);

      // Auto-select when only one machine is available
      if (available.length === 1) {
        setMachineId(available[0].id);
      }
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

  const fetchAvailableServices = async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setAvailableServices(data.settings?.available_services || ['Wash', 'Dry']);
        setServicePrices(data.settings?.service_prices || {});
      } else {
        setAvailableServices(['Wash', 'Dry']);
        setServicePrices({});
      }
    } catch {
      setAvailableServices(['Wash', 'Dry']);
      setServicePrices({});
    }
  };

  const calculateTotal = (services: string[]) => {
    return services.reduce((sum, s) => sum + (servicePrices[s] || 0), 0);
  };

  const toggleService = (service: string) => {
    const next = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    setSelectedServices(next);
    if (!priceManuallyChanged) {
      const total = next.reduce((sum, s) => sum + (servicePrices[s] || 0), 0);
      setPayAmount(total > 0 ? (Math.round(total * 100) / 100).toString() : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedServices.length === 0) {
      setError('Please select at least one service');
      return;
    }

    if (machines.length > 0 && !machineId) {
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

    if (priceManuallyChanged && !notes.trim()) {
      setError('Notes are required when the price differs from the calculated amount');
      return;
    }

    setLoading(true);

    try {
      const phoneClean = phone.replace(/[\s\-()]/g, '');
      const res = await fetchWithAuth('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(machineId ? { machine_id: machineId } : {}),
          ...(notifySms && phoneClean ? { phone: phoneClean } : {}),
          notify_sms: notifySms,
          notes: notes.trim() || undefined,
          customer_name: customerName.trim() || undefined,
          is_paid: isPaid,
          pay_amount: Number(payAmount),
          cash_tendered: isPaid && paymentMethod === 'cash' && cashTendered ? Number(cashTendered) : undefined,
          payment_method: isPaid ? paymentMethod : undefined,
          services: selectedServices,
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

  const autoTotal = calculateTotal(selectedServices);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 p-0 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d968b]" />

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4 shrink-0">
            <DialogTitle className="text-2xl font-bold text-[#111817]">
              {machineId ? 'Start New Job' : 'New Job'}
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              {machines.length > 0
                ? 'Select services and assign a machine.'
                : 'Select services. Job will be queued until a machine is free.'}
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

            {/* Services Checklist */}
            {availableServices.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-[#111817]">Services</Label>
                <div className="flex flex-wrap gap-2">
                  {availableServices.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
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
            )}

            {/* Customer Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-name" className="text-sm font-semibold text-[#111817]">Customer Name (Optional)</Label>
              <Input
                id="customer-name"
                type="text"
                placeholder="e.g., Juan Dela Cruz"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
                <Select value={machineId} onValueChange={setMachineId}>
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
                  onChange={(e) => {
                    setPayAmount(e.target.value);
                    const auto = calculateTotal(selectedServices);
                    const entered = e.target.value.trim() === '' ? null : parseFloat(e.target.value);
                    setPriceManuallyChanged(
                      entered !== null && !isNaN(entered) && auto > 0 && Math.abs(entered - auto) >= 0.01
                    );
                  }}
                  disabled={loading}
                  className="pl-7 h-12"
                />
              </div>
              {selectedServices.length > 0 && autoTotal > 0 && (
                <p className="text-xs text-slate-400">
                  Auto-calculated: ₱{autoTotal.toFixed(2)}
                  {priceManuallyChanged && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount((Math.round(autoTotal * 100) / 100).toString());
                        setPriceManuallyChanged(false);
                      }}
                      className="ml-2 text-[#0d968b] hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </p>
              )}
            </div>

            {/* Payment Status */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">Payment Status</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsPaid(true); setPaymentMethod(''); setCashTendered(''); }}
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
                  onClick={() => { setIsPaid(false); setPaymentMethod(''); setCashTendered(''); }}
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

            {/* Cash Tendered — only when Paid + Cash */}
            {isPaid && paymentMethod === 'cash' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="cash-tendered" className="text-sm font-semibold text-[#111817]">Cash Tendered</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₱</span>
                  <Input
                    id="cash-tendered"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    disabled={loading}
                    className="pl-7 h-12"
                  />
                </div>
                {cashTendered && Number(cashTendered) >= Number(payAmount) && Number(payAmount) > 0 && (
                  <p className="text-xs text-[#0d968b] font-medium">
                    Change: ₱{(Number(cashTendered) - Number(payAmount)).toFixed(2)}
                  </p>
                )}
                {cashTendered && Number(cashTendered) > 0 && Number(cashTendered) < Number(payAmount) && (
                  <p className="text-xs text-red-500 font-medium">
                    Insufficient — ₱{(Number(payAmount) - Number(cashTendered)).toFixed(2)} short
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">
                Notes {priceManuallyChanged ? '(Required — price differs from calculated)' : '(Optional)'}
              </Label>
              <Textarea
                placeholder={priceManuallyChanged
                  ? 'Explain why the price differs from the calculated amount'
                  : 'e.g., Extra spin, delicate cycle, low heat'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className={`min-h-16 sm:min-h-25 resize-none ${priceManuallyChanged && !notes.trim() ? 'border-amber-400 focus-visible:ring-amber-400/30' : ''}`}
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
              disabled={loading}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {machineId ? 'Starting...' : 'Queuing...'}
                </>
              ) : machineId ? (
                <>
                  Start Job
                  <Play className="size-4" />
                </>
              ) : (
                <>
                  Queue Job
                  <Clock className="size-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
