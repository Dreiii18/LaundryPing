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
}

export function SettingsForm({ initialName, initialAddress, initialServices }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [services, setServices] = useState<string[]>(initialServices);
  const [newService, setNewService] = useState('');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    name !== initialName ||
    address !== initialAddress ||
    JSON.stringify(services) !== JSON.stringify(initialServices);

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
    setNewService('');
  };

  const removeService = (index: number) => {
    if (services.length <= 1) {
      toast.error('At least one service is required');
      return;
    }
    setServices(services.filter((_, i) => i !== index));
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
          available_services: services,
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
          <Label className="text-sm font-semibold text-slate-700 mb-2">
            Services Offered
          </Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {services.map((service, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm py-1.5 px-3 gap-1.5"
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
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Add a service (e.g., Iron, Fold)"
              maxLength={50}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addService();
                }
              }}
            />
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
