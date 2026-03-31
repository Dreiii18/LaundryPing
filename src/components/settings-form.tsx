'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';

interface SettingsFormProps {
  initialName: string;
  initialAddress: string;
  initialServices: string[];
  initialServicePrices: Record<string, number>;
  initialContactNumber: string;
}

export function SettingsForm({ initialName, initialAddress, initialServices, initialServicePrices, initialContactNumber }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [contactNumber, setContactNumber] = useState(initialContactNumber);
  const [services, setServices] = useState<string[]>(initialServices);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>(initialServicePrices);
  const [newService, setNewService] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [saving, setSaving] = useState(false);

  const pricesEqual = (a: Record<string, number>, b: Record<string, number>) => {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => a[k] === b[k]);
  };

  const hasChanges =
    name !== initialName ||
    address !== initialAddress ||
    contactNumber !== initialContactNumber ||
    JSON.stringify(services) !== JSON.stringify(initialServices) ||
    !pricesEqual(servicePrices, initialServicePrices);

  const addService = () => {
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
    setServices([...services, trimmed]);
    setServicePrices({ ...servicePrices, [trimmed]: parseFloat(newServicePrice) || 0 });
    setNewService('');
    setNewServicePrice('');
  };

  const removeService = (index: number) => {
    if (services.length <= 1) {
      toast.error('At least one service is required');
      return;
    }
    const removedService = services[index];
    setServices(services.filter((_, i) => i !== index));
    setServicePrices(Object.fromEntries(
      Object.entries(servicePrices).filter(([key]) => key !== removedService)
    ));
  };

  const updateServicePrice = (service: string, price: string) => {
    const numPrice = parseFloat(price) || 0;
    setServicePrices({ ...servicePrices, [service]: numPrice });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 space-y-6">
        <div>
          <Label htmlFor="name" className="text-sm font-semibold text-slate-700 mb-2">
            Laundromat Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Clean & Go"
            maxLength={50}
            required
            className="h-12 min-h-11"
          />
          <p className="text-xs text-slate-400 mt-1">{name.length}/50 characters</p>
        </div>
        <div>
          <Label htmlFor="address" className="text-sm font-semibold text-slate-700 mb-2">
            Business Address
          </Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter full physical address"
            maxLength={200}
            rows={3}
            className="min-h-11"
          />
        </div>
        <div>
          <Label htmlFor="contact-number" className="text-sm font-semibold text-slate-700 mb-2">
            Contact Number
          </Label>
          <Input
            id="contact-number"
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="e.g., 09171234567"
            maxLength={20}
            className="h-12 min-h-11"
          />
          <p className="text-xs text-slate-400 mt-1">Shown on printed receipts</p>
        </div>
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2">
            Services Offered
          </Label>
          <div className="flex flex-col gap-2 mt-2">
            {services.map((service, index) => (
              <div key={service} className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-sm py-1.5 px-3 gap-1.5 shrink-0"
                >
                  {service}
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="hover:text-red-600 transition-colors"
                    aria-label={`Remove ${service}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </Badge>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">₱</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={servicePrices[service] || ''}
                    onChange={(e) => updateServicePrice(service, e.target.value)}
                    className="h-8 pl-6 text-sm"
                    aria-label={`Price for ${service}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Service name"
              maxLength={50}
              className="h-10 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addService();
                }
              }}
            />
            <div className="relative w-28 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">₱</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                className="h-10 pl-6 text-sm"
                aria-label="Price for new service"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addService();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addService}
              disabled={!newService.trim()}
              className="h-10 px-3 shrink-0"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 flex justify-end">
        <Button
          type="submit"
          disabled={saving || !hasChanges}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-md min-h-11"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            <>
              <Save className="size-4" />
              Save Changes
            </>
          ) : (
            <>
              <CheckCircle className="size-4" />
              Saved
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
