'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import type { SettingsFormProps } from './types';

function pricesEqual(a: Record<string, number>, b: Record<string, number>): boolean {
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
  initialContactNumber,
}: SettingsFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [contactNumber, setContactNumber] = useState(initialContactNumber);
  const [services, setServices] = useState<string[]>(initialServices);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>(initialServicePrices);
  const [newService, setNewService] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    name !== initialName ||
    address !== initialAddress ||
    contactNumber !== initialContactNumber ||
    JSON.stringify(services) !== JSON.stringify(initialServices) ||
    !pricesEqual(servicePrices, initialServicePrices);

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
    setNewService('');
    setNewServicePrice('');
  }, [newService, newServicePrice, services]);

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
  }, [services]);

  const updateServicePrice = useCallback((service: string, price: string) => {
    const numPrice = parseFloat(price) || 0;
    setServicePrices((prev) => ({ ...prev, [service]: numPrice }));
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
  }, [name, address, contactNumber, services, servicePrices, router, startTransition]);

  return {
    name,
    setName,
    address,
    setAddress,
    contactNumber,
    setContactNumber,
    services,
    servicePrices,
    newService,
    setNewService,
    newServicePrice,
    setNewServicePrice,
    saving,
    hasChanges,
    addService,
    removeService,
    updateServicePrice,
    handleSubmit,
  };
}
