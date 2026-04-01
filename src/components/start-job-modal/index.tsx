'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Play, Clock, AlertTriangle, XCircle, Flame } from 'lucide-react';
import { PhoneInput } from '@/components/phone-input';
import { useStartJobForm } from './use-start-job-form';
import { ServiceSelector } from './service-selector';
import { PaymentSection } from './payment-section';
import type { StartJobModalProps } from './types';

export function StartJobModal({ open, onOpenChange }: StartJobModalProps) {
  const form = useStartJobForm(open, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 p-0 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d968b]" />

        <form onSubmit={form.handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4 shrink-0">
            <DialogTitle className="text-2xl font-bold text-[#111817]">
              {form.machineId ? 'Start New Job' : 'New Job'}
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              {form.machines.length > 0
                ? 'Select services and assign a machine.'
                : 'Select services. Job will be queued until a machine is free.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-3 space-y-4 sm:px-8 sm:py-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
            {form.error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {form.error}
              </div>
            )}

            {/* SMS credit warnings */}
            {form.totalCredits !== null && (() => {
              if (form.totalCredits === 0) {
                return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                    <XCircle className="size-4 text-red-600 shrink-0" />
                    <span className="text-red-700">No SMS credits. Job will be tracked but no SMS will be sent.</span>
                  </div>
                );
              }
              if (form.totalCredits <= 10) {
                return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span className="text-amber-700">Low SMS credits: {form.totalCredits} credit{form.totalCredits !== 1 ? 's' : ''} remaining.</span>
                  </div>
                );
              }
              return null;
            })()}

            <ServiceSelector
              availableServices={form.availableServices}
              selectedServices={form.selectedServices}
              onToggle={form.toggleService}
            />

            {/* Customer Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-name" className="text-sm font-semibold text-[#111817]">Customer Name (Optional)</Label>
              <Input
                id="customer-name"
                type="text"
                placeholder="e.g., Juan Dela Cruz"
                value={form.customerName}
                onChange={(e) => form.setCustomerName(e.target.value)}
                maxLength={60}
                disabled={form.loading}
                className="h-12"
              />
            </div>

            {/* Machine Selection */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="machine-select" className="text-sm font-semibold text-[#111817]">Machine</Label>
              {form.loadingMachines ? (
                <div className="h-12 flex items-center text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Loading machines...
                </div>
              ) : form.machines.length === 0 ? (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                  No available machines — job will be queued.
                </div>
              ) : (
                <Select value={form.machineId} onValueChange={form.setMachineId}>
                  <SelectTrigger id="machine-select" className="w-full h-12 min-h-11">
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.machines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* SMS Notification */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">SMS Notification</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => form.setSmsOption('none')}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                    form.smsOption === 'none'
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  No SMS
                </button>
                {!form.machineId && !form.loadingMachines ? (
                  <>
                    <button
                      type="button"
                      onClick={() => form.setSmsOption('completion')}
                      className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                        form.smsOption === 'completion'
                          ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      Completion
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setSmsOption('queue_and_completion')}
                      className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                        form.smsOption === 'queue_and_completion'
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
                    onClick={() => form.setSmsOption('completion')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                      form.smsOption !== 'none'
                        ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Notify via SMS
                  </button>
                )}
              </div>
              {form.smsOption === 'queue_and_completion' && (
                <p className="text-xs text-slate-400">Uses 2 SMS credits (1 on queue + 1 on completion).</p>
              )}
              {form.smsOption === 'completion' && (
                <p className="text-xs text-slate-400">Uses 1 SMS credit on completion.</p>
              )}
            </div>

            {form.smsOption !== 'none' && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-[#111817]">Phone Number</Label>
                <PhoneInput
                  value={form.phone}
                  onChange={form.setPhone}
                  disabled={form.loading}
                />
              </div>
            )}

            {/* Queue-specific: Priority */}
            {!form.machineId && !form.loadingMachines && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-[#111817]">Priority</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => form.setPriority('normal')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                      form.priority === 'normal'
                        ? 'bg-[#0d968b]/10 border-[#0d968b] text-[#0d968b]'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setPriority('rush')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-orange-400/30 ${
                      form.priority === 'rush'
                        ? 'bg-orange-50 border-orange-400 text-orange-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Flame className="size-3.5 inline mr-1" />
                    Rush
                  </button>
                </div>
                {form.priority === 'rush' && form.rushFeeAmount > 0 && (
                  <p className="text-xs text-orange-600">
                    +₱{form.rushFeeAmount.toFixed(2)} rush fee applied
                  </p>
                )}
              </div>
            )}

            <PaymentSection
              payAmount={form.payAmount}
              autoTotal={form.autoTotal}
              selectedServices={form.selectedServices}
              priceManuallyChanged={form.priceManuallyChanged}
              isPaid={form.isPaid}
              paymentMethod={form.paymentMethod}
              cashTendered={form.cashTendered}
              loading={form.loading}
              onPayAmountChange={form.handlePayAmountChange}
              onResetToAutoPrice={form.resetToAutoPrice}
              onSetIsPaid={form.setIsPaid}
              onSetPaymentMethod={form.setPaymentMethod}
              onSetCashTendered={form.setCashTendered}
            />

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[#111817]">
                Notes {form.priceManuallyChanged ? '(Required — price differs from calculated)' : '(Optional)'}
              </Label>
              <Textarea
                placeholder={form.priceManuallyChanged
                  ? 'Explain why the price differs from the calculated amount'
                  : 'e.g., Extra spin, delicate cycle, low heat'
                }
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                maxLength={500}
                className={`min-h-16 sm:min-h-25 resize-none ${form.priceManuallyChanged && !form.notes.trim() ? 'border-amber-400 focus-visible:ring-amber-400/30' : ''}`}
              />
            </div>
          </div>

          <DialogFooter className="px-5 pb-5 pt-3 sm:px-8 sm:pb-8 sm:pt-4 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={form.loading}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.loading}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
            >
              {form.loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {form.machineId ? 'Starting...' : 'Queuing...'}
                </>
              ) : form.machineId ? (
                <>
                  Start Job
                  <Play className="size-4" />
                </>
              ) : (
                <>
                  Queue Job
                  <Clock className="size-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
