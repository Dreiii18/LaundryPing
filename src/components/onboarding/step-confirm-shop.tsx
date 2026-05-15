'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2, MessageSquare } from 'lucide-react';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { renderSmsTemplate, DEFAULT_COMPLETION_TEMPLATE } from '@/lib/sms/templates';

interface StepConfirmShopProps {
  initialShopName: string;
  initialContactNumber: string;
  onContinue: (shopName: string) => void;
}

export function StepConfirmShop({ initialShopName, initialContactNumber, onContinue }: StepConfirmShopProps) {
  const [shopName, setShopName] = useState(initialShopName);
  const [contactNumber, setContactNumber] = useState(initialContactNumber);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewMessage = renderSmsTemplate(null, DEFAULT_COMPLETION_TEMPLATE, {
    shop_name: shopName.trim() || 'Your Shop',
    customer_name: 'Maria',
    job_id: 'demo',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = shopName.trim();
    if (!trimmed) {
      setError('Shop name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          contact_number: contactNumber.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not save shop info');
        setSaving(false);
        return;
      }

      onContinue(trimmed);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#111817]">This is what your customers will see</h3>
        <p className="text-sm text-[#618986] mt-1">
          Make sure your shop name reads the way you want it to in the SMS.
        </p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
          <MessageSquare className="size-3.5" />
          <span>SMS preview</span>
        </div>
        <p className="text-sm text-[#111817] leading-relaxed">{previewMessage}</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="shop_name" className="text-sm font-semibold text-[#111817]">
          Shop name
        </Label>
        <Input
          id="shop_name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          maxLength={50}
          disabled={saving}
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_number" className="text-sm font-semibold text-[#111817]">
          Shop contact number <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="contact_number"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="Used on receipts"
          maxLength={20}
          disabled={saving}
          className="h-11"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Looks good
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
