'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, MessageSquare, Send } from 'lucide-react';
import { PhoneInput } from '@/components/phone-input';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { isValidPhNumber } from '@/lib/utils/phone';

interface StepTestSmsProps {
  shopName: string;
}

export function StepTestSms({ shopName }: StepTestSmsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValidPhNumber(phone)) {
      setError('Please enter a valid Philippine mobile number (e.g., 09171234567)');
      return;
    }

    setSending(true);
    try {
      const res = await fetchWithAuth('/api/onboarding/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not send test SMS');
        setSending(false);
        return;
      }

      setSent(true);
      // Brief moment to let the user see the success state, then enter the dashboard.
      setTimeout(() => {
        startTransition(() => {
          router.refresh();
          router.push('/dashboard');
        });
      }, 1200);
    } catch {
      setError('Network error');
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="size-14 rounded-full bg-[#0d968b]/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-[#0d968b]" />
        </div>
        <h3 className="text-lg font-bold text-[#111817]">SMS sent! Check your phone.</h3>
        <p className="text-sm text-[#618986]">Heading to your dashboard...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#111817]">Send a test SMS to your phone</h3>
        <p className="text-sm text-[#618986] mt-1">
          See exactly what your customers will receive. Uses 1 of your free SMS credits.
        </p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
          <MessageSquare className="size-3.5" />
          <span>You&apos;ll receive</span>
        </div>
        <p className="text-sm text-[#111817] leading-relaxed">
          [{shopName}] Hi, ready na po ang laundry niyo! Salamat po. - {shopName}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-[#111817]">Your mobile number</Label>
        <PhoneInput value={phone} onChange={setPhone} disabled={sending} />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={sending || phone.length === 0}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send to me
              <Send className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
