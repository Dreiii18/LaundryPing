'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import type { SettingsFormProps, PhaseMachineType } from './types';
import type { ServicePhaseConfigEntry } from '@/types/database';

const DEFAULT_PHASE_ENTRY: ServicePhaseConfigEntry = {
  is_phase: true,
  machine_type: 'combo',
  default_minutes: 30,
  sequence: 1,
};

function recordsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function stringRecordsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function phaseConfigsEqual(
  a: Record<string, ServicePhaseConfigEntry>,
  b: Record<string, ServicePhaseConfigEntry>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  if (!keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k))) return false;
  return keysA.every(
    (k) =>
      a[k].is_phase === b[k].is_phase &&
      a[k].machine_type === b[k].machine_type &&
      a[k].default_minutes === b[k].default_minutes &&
      a[k].sequence === b[k].sequence,
  );
}

export function useSettingsForm({
  initialName,
  initialAddress,
  initialServices,
  initialServicePrices,
  initialServiceWeights,
  initialServiceTypes,
  initialServicePhaseConfig,
  initialRushFee,
  initialContactNumber,
  initialReceiptPaperSize,
}: SettingsFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [contactNumber, setContactNumber] = useState(initialContactNumber);
  const [services, setServices] = useState<string[]>(initialServices);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>(initialServicePrices);
  const [serviceWeights, setServiceWeights] = useState<Record<string, number>>(initialServiceWeights);
  const [serviceTypes, setServiceTypes] = useState<Record<string, string>>(initialServiceTypes);
  const [servicePhaseConfig, setServicePhaseConfig] = useState<Record<string, ServicePhaseConfigEntry>>(initialServicePhaseConfig);
  const [rushFee, setRushFee] = useState(initialRushFee.toString());
  const [newService, setNewService] = useState('');
  const [receiptPaperSize, setReceiptPaperSize] = useState<'58mm' | '80mm'>(initialReceiptPaperSize);
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceWeight, setNewServiceWeight] = useState('');
  const [newServiceType, setNewServiceType] = useState('per_load');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    name !== initialName ||
    address !== initialAddress ||
    contactNumber !== initialContactNumber ||
    JSON.stringify(services) !== JSON.stringify(initialServices) ||
    !recordsEqual(servicePrices, initialServicePrices) ||
    !recordsEqual(serviceWeights, initialServiceWeights) ||
    !stringRecordsEqual(serviceTypes, initialServiceTypes) ||
    !phaseConfigsEqual(servicePhaseConfig, initialServicePhaseConfig) ||
    (parseFloat(rushFee) || 0) !== initialRushFee ||
    receiptPaperSize !== initialReceiptPaperSize;

  const addService = useCallback(() => {
    const trimmed = newService.trim();
    if (!trimmed) return;
    if (services.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Service already exists');
      return;
    }
    if (services.length >= 20) {
      toast.error('Maximum 20 services allowed');
      return;
    }
    setServices((prev) => [...prev, trimmed]);
    setServicePrices((prev) => ({ ...prev, [trimmed]: parseFloat(newServicePrice) || 0 }));
    setServiceWeights((prev) => ({ ...prev, [trimmed]: parseFloat(newServiceWeight) || 0 }));
    setServiceTypes((prev) => ({ ...prev, [trimmed]: newServiceType }));
    setServicePhaseConfig((prev) => ({
      ...prev,
      [trimmed]: { ...DEFAULT_PHASE_ENTRY, sequence: services.length + 1 },
    }));
    setNewService('');
    setNewServicePrice('');
    setNewServiceWeight('');
    setNewServiceType('per_load');
  }, [newService, newServicePrice, newServiceWeight, newServiceType, services]);

  const removeService = useCallback((index: number) => {
    if (services.length <= 1) {
      toast.error('At least one service is required');
      return;
    }
    const removedService = services[index];
    setServices((prev) => prev.filter((_, i) => i !== index));
    setServicePrices((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => key !== removedService))
    );
    setServiceWeights((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => key !== removedService))
    );
    setServiceTypes((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => key !== removedService))
    );
    setServicePhaseConfig((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => key !== removedService))
    );
  }, [services]);

  const updatePhaseIsPhase = useCallback((service: string, isPhase: boolean) => {
    setServicePhaseConfig((prev) => ({
      ...prev,
      [service]: { ...DEFAULT_PHASE_ENTRY, ...prev[service], is_phase: isPhase },
    }));
  }, []);

  const updatePhaseMachineType = useCallback((service: string, machineType: PhaseMachineType) => {
    setServicePhaseConfig((prev) => ({
      ...prev,
      [service]: {
        ...DEFAULT_PHASE_ENTRY,
        ...prev[service],
        machine_type: machineType === 'none' ? null : machineType,
      },
    }));
  }, []);

  const updatePhaseMinutes = useCallback((service: string, minutes: string) => {
    const n = Math.max(1, Math.min(1440, parseInt(minutes) || 1));
    setServicePhaseConfig((prev) => ({
      ...prev,
      [service]: { ...DEFAULT_PHASE_ENTRY, ...prev[service], default_minutes: n },
    }));
  }, []);

  const updateServicePrice = useCallback((service: string, price: string) => {
    const numPrice = parseFloat(price) || 0;
    setServicePrices((prev) => ({ ...prev, [service]: numPrice }));
  }, []);

  const updateServiceWeight = useCallback((service: string, weight: string) => {
    const numWeight = parseFloat(weight) || 0;
    setServiceWeights((prev) => ({ ...prev, [service]: numWeight }));
  }, []);

  const updateServiceType = useCallback((service: string, type: string) => {
    setServiceTypes((prev) => ({ ...prev, [service]: type }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Shop name is required');
      return;
    }

    if (services.length === 0) {
      toast.error('At least one service is required');
      return;
    }

    setSaving(true);

    try {
      // Auto-derive phase sequence from current service order so the user
      // doesn't have to manage it as a separate field.
      const phaseConfigToSend = Object.fromEntries(
        services.map((s, idx) => {
          const entry = servicePhaseConfig[s] ?? DEFAULT_PHASE_ENTRY;
          return [s, { ...entry, sequence: idx + 1 }];
        })
      );

      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          contact_number: contactNumber.trim() || null,
          available_services: services,
          service_prices: servicePrices,
          service_weights: serviceWeights,
          service_types: serviceTypes,
          service_phase_config: phaseConfigToSend,
          rush_fee: parseFloat(rushFee) || 0,
          receipt_paper_size: receiptPaperSize,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 409 with `conflicting: string[]` means in-flight phases reference
        // a service the user is trying to remove. Surface the conflicting
        // service names so the operator knows which jobs to clear first.
        if (res.status === 409 && Array.isArray(data?.conflicting) && data.conflicting.length > 0) {
          const list = data.conflicting.join(', ');
          toast.error(`Cannot save: open jobs still use ${list}. Complete or skip them first.`, {
            duration: 8000,
          });
        } else {
          toast.error(data.error || 'Failed to save settings');
        }
        setSaving(false);
        return;
      }

      toast.success('Settings saved successfully');
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [name, address, contactNumber, services, servicePrices, serviceWeights, serviceTypes, servicePhaseConfig, rushFee, receiptPaperSize, router, startTransition]);

  return {
    name,
    setName,
    address,
    setAddress,
    contactNumber,
    setContactNumber,
    services,
    servicePrices,
    serviceWeights,
    serviceTypes,
    servicePhaseConfig,
    rushFee,
    setRushFee,
    receiptPaperSize,
    setReceiptPaperSize,
    newService,
    setNewService,
    newServicePrice,
    setNewServicePrice,
    newServiceWeight,
    setNewServiceWeight,
    newServiceType,
    setNewServiceType,
    saving,
    hasChanges,
    addService,
    removeService,
    updateServicePrice,
    updateServiceWeight,
    updateServiceType,
    updatePhaseIsPhase,
    updatePhaseMachineType,
    updatePhaseMinutes,
    handleSubmit,
  };
}
