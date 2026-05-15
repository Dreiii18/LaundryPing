'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { PhoneInput } from '@/components/phone-input';
import { PaymentSection } from './payment-section';

interface StepPaymentNotificationProps {
  error: string;
  totalCredits: number | null;
  // Payment
  payAmount: string;
  autoTotal: number;
  selectedServices: string[];
  priceManuallyChanged: boolean;
  isPaid: boolean;
  paymentMethod: string;
  cashTendered: string;
  loading: boolean;
  onPayAmountChange: (value: string, services: string[]) => void;
  onResetToAutoPrice: (autoTotal: number) => void;
  onSetIsPaid: (paid: boolean) => void;
  onSetPaymentMethod: (method: string) => void;
  onSetCashTendered: (value: string) => void;
  // SMS
  smsOption: 'none' | 'completion' | 'queue_and_completion';
  onSmsOptionChange: (opt: 'none' | 'completion' | 'queue_and_completion') => void;
  machineId: string;
  loadingMachines: boolean;
  phone: string;
  onPhoneChange: (value: string) => void;
  // Notes
  notes: string;
  onNotesChange: (value: string) => void;
}

export function StepPaymentNotification({
  error,
  totalCredits,
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
  smsOption,
  onSmsOptionChange,
  machineId,
  loadingMachines,
  phone,
  onPhoneChange,
  notes,
  onNotesChange,
}: StepPaymentNotificationProps) {
  return (
    <div className="px-5 py-3 space-y-4 sm:px-8 sm:py-4 sm:space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* SMS credit warnings */}
      {totalCredits !== null && (() => {
        if (totalCredits === 0) {
          return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
              <XCircle className="size-4 text-red-600 shrink-0" />
              <span className="text-red-700">No SMS credits. Job will be tracked but no SMS will be sent.</span>
            </div>
          );
        }
        if (totalCredits <= 10) {
          return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
              <AlertTriangle className="size-4 text-amber-600 shrink-0" />
              <span className="text-amber-700">Low SMS credits: {totalCredits} credit{totalCredits !== 1 ? 's' : ''} remaining.</span>
            </div>
          );
        }
        return null;
      })()}

      <PaymentSection
        payAmount={payAmount}
        autoTotal={autoTotal}
        selectedServices={selectedServices}
        priceManuallyChanged={priceManuallyChanged}
        isPaid={isPaid}
        paymentMethod={paymentMethod}
        cashTendered={cashTendered}
        loading={loading}
        onPayAmountChange={onPayAmountChange}
        onResetToAutoPrice={onResetToAutoPrice}
        onSetIsPaid={onSetIsPaid}
        onSetPaymentMethod={onSetPaymentMethod}
        onSetCashTendered={onSetCashTendered}
      />

      {/* Phone — always visible; blank phone surfaces a yellow warning instead
          of silently producing a no-SMS job. */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-[#111817]">
          Customer phone number
        </Label>
        <PhoneInput
          value={phone}
          onChange={onPhoneChange}
          disabled={loading}
        />
        {phone.trim() === '' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-amber-800">
              No phone number — the customer won&apos;t get an SMS when their load is ready.
              Add a number to notify them.
            </span>
          </div>
        )}
        {phone.trim() !== '' && smsOption === 'none' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
            <Info className="size-4 text-slate-500 shrink-0 mt-0.5" />
            <span className="text-slate-700">SMS notifications are off for this job.</span>
          </div>
        )}
      </div>

      {/* SMS Notification */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-[#111817]">SMS Notification</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSmsOptionChange('none')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
              smsOption === 'none'
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            No SMS
          </button>
          {!machineId && !loadingMachines ? (
            <>
              <button
                type="button"
                onClick={() => onSmsOptionChange('completion')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                  smsOption === 'completion'
                    ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                Completion
              </button>
              <button
                type="button"
                onClick={() => onSmsOptionChange('queue_and_completion')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                  smsOption === 'queue_and_completion'
                    ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                Queue + Done
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSmsOptionChange('completion')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                smsOption !== 'none'
                  ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Notify via SMS
            </button>
          )}
        </div>
        {smsOption === 'queue_and_completion' && (
          <p className="text-xs text-slate-400">Uses 2 SMS credits (1 on queue + 1 on completion).</p>
        )}
        {smsOption === 'completion' && (
          <p className="text-xs text-slate-400">Uses 1 SMS credit on completion.</p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-[#111817]">
          Notes {priceManuallyChanged ? '(Required — price differs from calculated)' : '(Optional)'}
        </Label>
        <Textarea
          placeholder={priceManuallyChanged
            ? 'Explain why the price differs from the calculated amount'
            : 'e.g., Extra spin, delicate cycle, low heat'
          }
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={500}
          className={`min-h-16 sm:min-h-25 resize-none ${priceManuallyChanged && !notes.trim() ? 'border-amber-400 focus-visible:ring-amber-400/30' : ''}`}
        />
      </div>
    </div>
  );
}
