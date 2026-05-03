'use client';

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { isValidPhNumber } from '@/lib/utils/phone';
import type { Machine } from './types';
import type { ServicePhaseConfigEntry } from '@/types/database';

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
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [serviceWeightsActual, setServiceWeightsActual] = useState<Record<string, number>>({});
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [serviceWeights, setServiceWeights] = useState<Record<string, number>>({});
  const [serviceTypes, setServiceTypes] = useState<Record<string, string>>({});
  const [servicePhaseConfig, setServicePhaseConfig] = useState<Record<string, ServicePhaseConfigEntry>>({});
  const [priceManuallyChanged, setPriceManuallyChanged] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [priority, setPriority] = useState<'normal' | 'rush'>('normal');
  const [rushFeeAmount, setRushFeeAmount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const fetchMachines = useCallback(async () => {
    setLoadingMachines(true);
    try {
      // Server-side filtering by active phases is more accurate than client-side joining.
      const machinesRes = await fetchWithAuth('/api/machines?available=true');
      const machinesData = await machinesRes.json();
      const available = (machinesData.machines || []) as Machine[];

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
        setServiceWeights(data.settings?.service_weights || {});
        setServiceTypes(data.settings?.service_types || {});
        setServicePhaseConfig(data.settings?.service_phase_config || {});
        setRushFeeAmount(Number(data.settings?.rush_fee) || 0);
      } else {
        setAvailableServices(['Wash', 'Dry']);
        setServicePrices({});
        setServiceWeights({});
        setServiceTypes({});
        setServicePhaseConfig({});
        setRushFeeAmount(0);
      }
    } catch {
      setAvailableServices(['Wash', 'Dry']);
      setServicePrices({});
      setServiceWeights({});
      setServiceTypes({});
      setServicePhaseConfig({});
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
      setServiceQuantities({});
      setServiceWeightsActual({});
      setServicePrices({});
      setServiceWeights({});
      setServiceTypes({});
      setServicePhaseConfig({});
      setPriceManuallyChanged(false);
      setCashTendered('');
      setPriority('normal');
      setError('');
      setLoading(false);
      setTotalCredits(null);
      setStep(1);
      fetchMachines();
      fetchSmsCredits();
      fetchAvailableServices();
    }
  }, [open, fetchMachines, fetchSmsCredits, fetchAvailableServices]);

  const getServiceType = useCallback((service: string) => {
    return serviceTypes[service] ?? 'per_load';
  }, [serviceTypes]);

  /** First selected service that's an operational phase, in user-selection order. */
  const firstPhaseRequiredType = useMemo(() => {
    for (const s of selectedServices) {
      const cfg = servicePhaseConfig[s];
      // If config says is_phase=false, skip this service. Unknown services
      // default to is_phase=true so they participate.
      if (cfg && cfg.is_phase === false) continue;
      return cfg?.machine_type ?? null; // null = no machine required
    }
    return undefined; // no selected phase requires a machine
  }, [selectedServices, servicePhaseConfig]);

  /** Machines compatible with the first phase. 'combo' fits any required type. */
  const compatibleMachines = useMemo(() => {
    if (firstPhaseRequiredType === undefined) return machines;
    if (firstPhaseRequiredType === null) return [];
    return machines.filter((m) => {
      if (!m.machine_type) return true; // legacy machines without type metadata
      if (m.machine_type === 'combo') return true;
      return m.machine_type === firstPhaseRequiredType;
    });
  }, [machines, firstPhaseRequiredType]);

  /** Should the modal show a machine picker at all?
   *  - undefined: no service selected yet, or all selected services are admin
   *    (is_phase=false). Backend handles admin-only jobs by skipping straight
   *    to ready_for_pickup, so no machine is needed in the UI either.
   *  - null: a phase is selected but it explicitly needs no machine (e.g. Fold).
   *  - washer/dryer/combo/other: a phase needs a specific machine. */
  const machineRequired =
    firstPhaseRequiredType !== null && firstPhaseRequiredType !== undefined;

  // Auto-clear stale machineId when the user's service choice makes the
  // previously-selected machine incompatible (e.g. single-machine washer shop
  // auto-selects W1, then user picks Dry → W1 disappears from the picker but
  // would still be submitted without this guard).
  useEffect(() => {
    if (machineId && !compatibleMachines.find((m) => m.id === machineId)) {
      setMachineId('');
    }
  }, [compatibleMachines, machineId]);

  const calculateTotal = useCallback((services: string[], currentPriority: 'normal' | 'rush' = priority, currentMachineId: string = machineId, quantities: Record<string, number> = serviceQuantities, weightsActual: Record<string, number> = serviceWeightsActual) => {
    const serviceTotal = services.reduce((sum, s) => {
      const type = serviceTypes[s] ?? 'per_load';
      const price = servicePrices[s] || 0;
      if (type === 'per_kg') {
        return sum + price * (weightsActual[s] || 0);
      }
      // per_load and fixed: price * quantity
      return sum + price * (quantities[s] || 1);
    }, 0);
    const rushSurcharge = (!currentMachineId && currentPriority === 'rush') ? rushFeeAmount : 0;
    return serviceTotal + rushSurcharge;
  }, [servicePrices, serviceTypes, rushFeeAmount, priority, machineId, serviceQuantities, serviceWeightsActual]);

  const calculateTotalWeight = useCallback((services: string[], quantities: Record<string, number> = serviceQuantities, weightsActual: Record<string, number> = serviceWeightsActual) => {
    return services.reduce((sum, s) => {
      const type = serviceTypes[s] ?? 'per_load';
      if (type === 'per_kg') {
        return sum + (weightsActual[s] || 0);
      }
      if (type === 'per_load') {
        const w = serviceWeights[s] || 0;
        return w > 0 ? sum + w * (quantities[s] || 1) : sum;
      }
      // fixed: no weight contribution
      return sum;
    }, 0);
  }, [serviceWeights, serviceTypes, serviceQuantities, serviceWeightsActual]);

  const toggleService = useCallback((service: string) => {
    const isSelected = selectedServices.includes(service);
    const next = isSelected
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    setSelectedServices(next);

    const nextQuantities = { ...serviceQuantities };
    const nextWeightsActual = { ...serviceWeightsActual };
    if (isSelected) {
      delete nextQuantities[service];
      delete nextWeightsActual[service];
    } else {
      const type = serviceTypes[service] ?? 'per_load';
      if (type === 'per_kg') {
        nextWeightsActual[service] = 0;
      } else {
        nextQuantities[service] = 1;
      }
    }
    setServiceQuantities(nextQuantities);
    setServiceWeightsActual(nextWeightsActual);

    if (!priceManuallyChanged) {
      const total = calculateTotal(next, undefined, undefined, nextQuantities, nextWeightsActual);
      setPayAmount(total > 0 ? (Math.round(total * 100) / 100).toString() : '');
    }
  }, [selectedServices, serviceQuantities, serviceWeightsActual, serviceTypes, priceManuallyChanged, calculateTotal]);

  const setServiceQuantity = useCallback((service: string, qty: number) => {
    const clamped = Math.max(1, Math.min(10, qty));
    const nextQuantities = { ...serviceQuantities, [service]: clamped };
    setServiceQuantities(nextQuantities);
    if (!priceManuallyChanged) {
      const total = calculateTotal(selectedServices, undefined, undefined, nextQuantities);
      setPayAmount(total > 0 ? (Math.round(total * 100) / 100).toString() : '');
    }
  }, [serviceQuantities, priceManuallyChanged, calculateTotal, selectedServices]);

  const setServiceWeightActual = useCallback((service: string, weight: number) => {
    const clamped = Math.max(0, Math.min(9999, weight));
    const nextWeightsActual = { ...serviceWeightsActual, [service]: clamped };
    setServiceWeightsActual(nextWeightsActual);
    if (!priceManuallyChanged) {
      const total = calculateTotal(selectedServices, undefined, undefined, undefined, nextWeightsActual);
      setPayAmount(total > 0 ? (Math.round(total * 100) / 100).toString() : '');
    }
  }, [serviceWeightsActual, priceManuallyChanged, calculateTotal, selectedServices]);

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

  const validateStep1 = useCallback((): string | null => {
    if (selectedServices.length === 0) {
      return 'Please select at least one service';
    }
    // Validate per_kg services have weight > 0
    for (const s of selectedServices) {
      if ((serviceTypes[s] ?? 'per_load') === 'per_kg' && !(serviceWeightsActual[s] > 0)) {
        return `Please enter weight for "${s}"`;
      }
    }
    if (machineRequired && compatibleMachines.length > 0 && !machineId) {
      return 'Please select a machine';
    }
    return null;
  }, [selectedServices, serviceTypes, serviceWeightsActual, machineRequired, compatibleMachines, machineId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedServices.length === 0) {
      setError('Please select at least one service');
      return;
    }

    if (machineRequired && compatibleMachines.length > 0 && !machineId) {
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

    // Build service_weights_actual for per_kg services only
    const perKgWeights: Record<string, number> = {};
    for (const s of selectedServices) {
      if ((serviceTypes[s] ?? 'per_load') === 'per_kg' && serviceWeightsActual[s] > 0) {
        perKgWeights[s] = serviceWeightsActual[s];
      }
    }

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
          service_quantities: Object.keys(serviceQuantities).length > 0 ? serviceQuantities : undefined,
          service_weights_actual: Object.keys(perKgWeights).length > 0 ? perKgWeights : undefined,
          total_weight: (() => {
            const tw = calculateTotalWeight(selectedServices);
            return tw > 0 ? Math.round(tw * 100) / 100 : undefined;
          })(),
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
    serviceQuantities,
    serviceWeightsActual,
    serviceTypes,
    calculateTotalWeight,
    compatibleMachines,
    machineRequired,
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
    machines: compatibleMachines,
    allMachines: machines,
    machineRequired,
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
    serviceQuantities,
    serviceWeightsActual,
    availableServices,
    servicePrices,
    serviceTypes,
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
    totalWeight: calculateTotalWeight(selectedServices),
    // Handlers
    toggleService,
    setServiceQuantity,
    setServiceWeightActual,
    getServiceType,
    handlePayAmountChange,
    resetToAutoPrice,
    handleSubmit,
    // Step wizard support
    step,
    setStep,
    validateStep1,
    setError,
  };
}
