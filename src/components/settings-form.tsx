'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';

interface SettingsFormProps {
  initialName: string;
  initialAddress: string;
}

export function SettingsForm({ initialName, initialAddress }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [saving, setSaving] = useState(false);

  const hasChanges = name !== initialName || address !== initialAddress;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Shop name is required');
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
