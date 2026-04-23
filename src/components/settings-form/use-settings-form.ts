'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import type { SettingsFormProps } from './types';

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

export function useSettingsForm({
  initialName,
  initialAddress,
  initialServices,
  initialServicePrices,
  initialServiceWeights,
  initialServiceTypes,
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
  }, [services]);

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
          rush_fee: parseFloat(rushFee) || 0,
          receipt_paper_size: receiptPaperSize,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings');
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
  }, [name, address, contactNumber, services, servicePrices, serviceWeights, serviceTypes, rushFee, receiptPaperSize, router, startTransition]);

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
    handleSubmit,
  };
}
