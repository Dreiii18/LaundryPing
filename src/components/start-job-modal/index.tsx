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
import { Loader2, Play, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStartJobForm } from './use-start-job-form';
import { StepJobDetails } from './step-job-details';
import { StepPaymentNotification } from './step-payment-notification';
import type { StartJobModalProps } from './types';

export function StartJobModal({ open, onOpenChange }: StartJobModalProps) {
  const form = useStartJobForm(open, onOpenChange);
  const { step } = form;

  function handleNext() {
    form.setError('');
    const err = form.validateStep1();
    if (err) {
      form.setError(err);
      return;
    }
    form.setStep(2);
  }

  function handleBack() {
    form.setError('');
    form.setStep(1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 p-0 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d968b]" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 1) {
              handleNext();
            } else {
              form.handleSubmit(e);
            }
          }}
          className="flex flex-col min-h-0 flex-1"
        >
          <div className="shrink-0">
            <DialogHeader className="px-5 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
              <DialogTitle className="text-2xl font-bold text-[#111817]">
                {form.machineId ? 'Start New Job' : 'New Job'}
              </DialogTitle>
              <DialogDescription className="text-[#618986]">
                {form.machines.length > 0
                  ? 'Select services and assign a machine.'
                  : 'Select services. Job will be queued until a machine is free.'}
              </DialogDescription>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center px-5 sm:px-8 pb-3 sm:pb-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300',
                  'bg-[#0d968b] text-white'
                )}>
                  1
                </div>
                <span className={cn(
                  'text-sm font-semibold transition-colors duration-300',
                  step === 1 ? 'text-[#111817]' : 'text-slate-400'
                )}>
                  <span className="hidden sm:inline">Job Details</span>
                  <span className="sm:hidden">Details</span>
                </span>
              </div>

              <div className="flex-1 mx-3 h-0.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={cn(
                  'h-full bg-[#0d968b] transition-all duration-300',
                  step >= 2 ? 'w-full' : 'w-0'
                )} />
              </div>

              <div className="flex items-center gap-2">
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300',
                  step >= 2
                    ? 'bg-[#0d968b] text-white'
                    : 'bg-slate-200 text-slate-500'
                )}>
                  2
                </div>
                <span className={cn(
                  'text-sm font-semibold transition-colors duration-300',
                  step === 2 ? 'text-[#111817]' : 'text-slate-400'
                )}>
                  <span className="hidden sm:inline">Payment & SMS</span>
                  <span className="sm:hidden">Payment</span>
                </span>
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {step === 1 ? (
              <StepJobDetails
                error={form.error}
                availableServices={form.availableServices}
                selectedServices={form.selectedServices}
                onToggle={form.toggleService}
                serviceQuantities={form.serviceQuantities}
                onQuantityChange={form.setServiceQuantity}
                serviceTypes={form.serviceTypes}
                serviceWeightsActual={form.serviceWeightsActual}
                onWeightActualChange={form.setServiceWeightActual}
                totalWeight={form.totalWeight}
                customerName={form.customerName}
                onCustomerNameChange={form.setCustomerName}
                loadingMachines={form.loadingMachines}
                machines={form.machines}
                machineId={form.machineId}
                onMachineChange={form.setMachineId}
                priority={form.priority}
                onPriorityChange={form.setPriority}
                rushFeeAmount={form.rushFeeAmount}
                loading={form.loading}
              />
            ) : (
              <StepPaymentNotification
                error={form.error}
                totalCredits={form.totalCredits}
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
                smsOption={form.smsOption}
                onSmsOptionChange={form.setSmsOption}
                machineId={form.machineId}
                loadingMachines={form.loadingMachines}
                phone={form.phone}
                onPhoneChange={form.setPhone}
                notes={form.notes}
                onNotesChange={form.setNotes}
              />
            )}
          </div>

          {/* Step-aware footer */}
          <DialogFooter className="px-5 pb-5 pt-3 sm:px-8 sm:pb-8 sm:pt-4 shrink-0">
            {step === 1 ? (
              <>
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
                  type="button"
                  onClick={handleNext}
                  className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-lg shadow-[#0d968b]/20 min-h-11"
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              </>
            ) : (
              <>
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
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={form.loading}
                  className="min-h-11"
                >
                  <ArrowLeft className="size-4" />
                  Back
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
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
