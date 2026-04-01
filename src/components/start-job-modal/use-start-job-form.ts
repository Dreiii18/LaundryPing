'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { isValidPhNumber } from '@/lib/utils/phone';
import type { Machine } from './types';

export function useStartJobForm(open: boolean, onOpenChange: (open: boolean) => void) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [smsOption, setSmsOption] = useState<'none' | 'completion' | 'queue_and_completion'>('completion');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [priceManuallyChanged, setPriceManuallyChanged] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [priority, setPriority] = useState<'normal' | 'rush'>('normal');
  const [rushFeeAmount, setRushFeeAmount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);

  const fetchMachines = useCallback(async () => {
    setLoadingMachines(true);
    try {
      const machinesRes = await fetchWithAuth('/api/machines');
      const machinesData = await machinesRes.json();

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
      const available = allMachines.filter(
        (m: Machine) => !activeMachineIds.has(m.id)
      );

      setMachines(available);

      if (available.length === 1) {
        setMachineId(available[0].id);
      }
    } catch {
      setError('Failed to load machines');
    } finally {
      setLoadingMachines(false);
    }
  }, []);

  const fetchSmsCredits = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/sms/usage');
      if (res.ok) {
        const data = await res.json();
        setTotalCredits(data.totalCredits ?? 0);
      }
    } catch {
      // Non-blocking — silently ignore failures
    }
  }, []);

  const fetchAvailableServices = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setAvailableServices(data.settings?.available_services || ['Wash', 'Dry']);
        setServicePrices(data.settings?.service_prices || {});
        setRushFeeAmount(Number(data.settings?.rush_fee) || 0);
      } else {
        setAvailableServices(['Wash', 'Dry']);
        setServicePrices({});
        setRushFeeAmount(0);
      }
    } catch {
      setAvailableServices(['Wash', 'Dry']);
      setServicePrices({});
      setRushFeeAmount(0);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setMachineId('');
      setPhone('');
      setNotes('');
      setCustomerName('');
      setIsPaid(true);
      setPayAmount('');
      setPaymentMethod('');
      setSmsOption('completion');
      setSelectedServices([]);
      setServicePrices({});
      setPriceManuallyChanged(false);
      setCashTendered('');
      setPriority('normal');
      setError('');
      setLoading(false);
      setTotalCredits(null);
      fetchMachines();
      fetchSmsCredits();
      fetchAvailableServices();
    }
  }, [open, fetchMachines, fetchSmsCredits, fetchAvailableServices]);

  const calculateTotal = useCallback((services: string[], currentPriority: 'normal' | 'rush' = priority, currentMachineId: string = machineId) => {
    const serviceTotal = services.reduce((sum, s) => sum + (servicePrices[s] || 0), 0);
    const rushSurcharge = (!currentMachineId && currentPriority === 'rush') ? rushFeeAmount : 0;
    return serviceTotal + rushSurcharge;
  }, [servicePrices, rushFeeAmount, priority, machineId]);

  const toggleService = useCallback((service: string) => {
    const next = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    setSelectedServices(next);
    if (!priceManuallyChanged) {
      const total = calculateTotal(next);
      setPayAmount(total > 0 ? (Math.round(total * 100) / 100).toString() : '');
    }
  }, [selectedServices, priceManuallyChanged, calculateTotal]);

  const handlePayAmountChange = useCallback((value: string, currentServices: string[]) => {
    setPayAmount(value);
    const auto = calculateTotal(currentServices);
    const entered = value.trim() === '' ? null : parseFloat(value);
    setPriceManuallyChanged(
      entered !== null && !isNaN(entered) && auto > 0 && Math.abs(entered - auto) >= 0.01
    );
  }, [calculateTotal]);

  const resetToAutoPrice = useCallback((autoTotal: number) => {
    setPayAmount((Math.round(autoTotal * 100) / 100).toString());
    setPriceManuallyChanged(false);
  }, []);

  const handleMachineChange = useCallback((newMachineId: string) => {
    setMachineId(newMachineId);
    // Downgrade queue+completion to completion when a machine is selected (no longer queued)
    if (newMachineId && smsOption === 'queue_and_completion') {
      setSmsOption('completion');
    }
  }, [smsOption]);

  const handleSmsOptionChange = useCallback((option: 'none' | 'completion' | 'queue_and_completion') => {
    setSmsOption(option);
    if (option === 'none') {
      setPhone('');
    }
  }, []);

  const handlePriorityChange = useCallback((newPriority: 'normal' | 'rush') => {
    setPriority(newPriority);
    if (!priceManuallyChanged && selectedServices.length > 0) {
      const total = calculateTotal(selectedServices, newPriority);
      setPayAmount(total > 0 ? (Math.round(total * 100) / 100).toString() : '');
    }
  }, [priceManuallyChanged, selectedServices, calculateTotal]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

    const notifySms = smsOption !== 'none';
    const notifyQueueSms = smsOption === 'queue_and_completion';

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
          notify_queue_sms: notifyQueueSms,
          notes: notes.trim() || undefined,
          customer_name: customerName.trim() || undefined,
          is_paid: isPaid,
          pay_amount: Number(payAmount),
          cash_tendered: isPaid && paymentMethod === 'cash' && cashTendered ? Number(cashTendered) : undefined,
          payment_method: isPaid ? paymentMethod : undefined,
          services: selectedServices,
          ...(!machineId ? { priority } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start job');
        setLoading(false);
        return;
      }

      // Show queue SMS feedback
      if (data.queueSmsSent === true) {
        toast.success('Queue notification SMS sent.');
      } else if (data.queueSmsSkipReason === 'no_credits') {
        toast.warning('Queue SMS skipped: no credits remaining.');
      } else if (data.queueSmsSkipReason) {
        toast.warning('Queue SMS could not be sent.');
      }

      onOpenChange(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }, [
    selectedServices,
    machines.length,
    machineId,
    smsOption,
    phone,
    payAmount,
    isPaid,
    paymentMethod,
    priceManuallyChanged,
    notes,
    customerName,
    cashTendered,
    priority,
    onOpenChange,
    router,
    startTransition,
  ]);

  return {
    // State
    machines,
    machineId,
    setMachineId: handleMachineChange,
    phone,
    setPhone,
    notes,
    setNotes,
    customerName,
    setCustomerName,
    isPaid,
    setIsPaid,
    payAmount,
    paymentMethod,
    setPaymentMethod,
    smsOption,
    setSmsOption: handleSmsOptionChange,
    selectedServices,
    availableServices,
    servicePrices,
    priceManuallyChanged,
    cashTendered,
    setCashTendered,
    error,
    loading,
    loadingMachines,
    totalCredits,
    priority,
    setPriority: handlePriorityChange,
    rushFeeAmount,
    // Computed
    autoTotal: calculateTotal(selectedServices),
    // Handlers
    toggleService,
    handlePayAmountChange,
    resetToAutoPrice,
    handleSubmit,
  };
}
