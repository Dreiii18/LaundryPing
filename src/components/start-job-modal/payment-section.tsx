'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAYMENT_METHODS } from './types';

interface PaymentSectionProps {
  payAmount: string;
  autoTotal: number;
  selectedServices: string[];
  priceManuallyChanged: boolean;
  isPaid: boolean;
  paymentMethod: string;
  cashTendered: string;
  loading: boolean;
  onPayAmountChange: (value: string, currentServices: string[]) => void;
  onResetToAutoPrice: (autoTotal: number) => void;
  onSetIsPaid: (paid: boolean) => void;
  onSetPaymentMethod: (method: string) => void;
  onSetCashTendered: (value: string) => void;
}

export function PaymentSection({
  payAmount,
  autoTotal,
  selectedServices,
  priceManuallyChanged,
  isPaid,
  paymentMethod,
  cashTendered,
  loading,
  onPayAmountChange,
  onResetToAutoPrice,
  onSetIsPaid,
  onSetPaymentMethod,
  onSetCashTendered,
}: PaymentSectionProps) {
  return (
    <>
      {/* Pay Amount */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pay-amount" className="text-sm font-semibold text-[#111817]">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₱</span>
          <Input
            id="pay-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={payAmount}
            onChange={(e) => onPayAmountChange(e.target.value, selectedServices)}
            disabled={loading}
            className="pl-7 h-12"
          />
        </div>
        {selectedServices.length > 0 && autoTotal > 0 && (
          <p className="text-xs text-slate-400">
            Auto-calculated: ₱{autoTotal.toFixed(2)}
            {priceManuallyChanged && (
              <button
                type="button"
                onClick={() => onResetToAutoPrice(autoTotal)}
                className="ml-2 text-[#0d968b] hover:underline"
              >
                Reset
              </button>
            )}
          </p>
        )}
      </div>

      {/* Payment Status */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-[#111817]">Payment Status</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { onSetIsPaid(true); onSetPaymentMethod(''); onSetCashTendered(''); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
              isPaid
                ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Paid
          </button>
          <button
            type="button"
            onClick={() => { onSetIsPaid(false); onSetPaymentMethod(''); onSetCashTendered(''); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
              !isPaid
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Pay Later
          </button>
        </div>
      </div>

      {/* Payment Method — only when Paid */}
      {isPaid && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-method" className="text-sm font-semibold text-[#111817]">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={onSetPaymentMethod}>
            <SelectTrigger id="payment-method" className="w-full h-12 min-h-11">
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
      )}

      {/* Cash Tendered — only when Paid + Cash */}
      {isPaid && paymentMethod === 'cash' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="cash-tendered" className="text-sm font-semibold text-[#111817]">Cash Tendered</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₱</span>
            <Input
              id="cash-tendered"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cashTendered}
              onChange={(e) => onSetCashTendered(e.target.value)}
              disabled={loading}
              className="pl-7 h-12"
            />
          </div>
          {cashTendered && Number(cashTendered) >= Number(payAmount) && Number(payAmount) > 0 && (
            <p className="text-xs text-[#0d968b] font-medium">
              Change: ₱{(Number(cashTendered) - Number(payAmount)).toFixed(2)}
            </p>
          )}
          {cashTendered && Number(cashTendered) > 0 && Number(cashTendered) < Number(payAmount) && (
            <p className="text-xs text-red-500 font-medium">
              Insufficient — ₱{(Number(payAmount) - Number(cashTendered)).toFixed(2)} short
            </p>
          )}
        </div>
      )}
    </>
  );
}
