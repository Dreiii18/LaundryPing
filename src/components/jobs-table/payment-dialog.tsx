'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PAYMENT_METHODS } from './types';

interface PaymentDialogProps {
  payLaterJobId: string | null;
  payLaterMethod: string;
  payLaterCashTendered: string;
  payAmount: number | null;
  onMethodChange: (method: string) => void;
  onCashTenderedChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function PaymentDialog({
  payLaterJobId,
  payLaterMethod,
  payLaterCashTendered,
  payAmount,
  onMethodChange,
  onCashTenderedChange,
  onConfirm,
  onClose,
}: PaymentDialogProps) {
  const cashTenderedNum = parseFloat(payLaterCashTendered) || 0;
  const amount = payAmount ?? 0;
  const change = cashTenderedNum > amount ? cashTenderedNum - amount : 0;

  return (
    <Dialog open={payLaterJobId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#111817]">
            Collect Payment
          </DialogTitle>
          <DialogDescription className="text-[#618986]">
            Select the payment method used by the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {payAmount != null && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-sm text-slate-500">Amount due</span>
              <span className="text-lg font-bold text-slate-800">
                ₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="pay-later-method" className="text-sm font-semibold text-[#111817]">Payment Method</Label>
            <Select value={payLaterMethod} onValueChange={(val) => { onMethodChange(val); onCashTenderedChange(''); }}>
              <SelectTrigger id="pay-later-method" className="w-full h-12 mt-2">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {payLaterMethod === 'cash' && (
            <div>
              <Label htmlFor="cash-tendered" className="text-sm font-semibold text-[#111817]">Cash Tendered</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₱</span>
                <Input
                  id="cash-tendered"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={payLaterCashTendered}
                  onChange={(e) => onCashTenderedChange(e.target.value)}
                  className="h-12 pl-7"
                />
              </div>
              {cashTenderedNum > 0 && cashTenderedNum >= amount && (
                <div className="flex items-center justify-between mt-2 p-2.5 rounded-lg bg-[#0d968b]/5 border border-[#0d968b]/10">
                  <span className="text-sm text-[#0d968b] font-medium">Change</span>
                  <span className="text-sm font-bold text-[#0d968b]">
                    ₱{change.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {cashTenderedNum > 0 && cashTenderedNum < amount && (
                <p className="text-xs text-red-500 mt-1">
                  Insufficient — ₱{(amount - cashTenderedNum).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} short
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!payLaterMethod || (payLaterMethod === 'cash' && payLaterCashTendered !== '' && cashTenderedNum < amount)}
            onClick={onConfirm}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
          >
            Confirm & Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
