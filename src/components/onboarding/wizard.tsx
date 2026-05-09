'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { StepConfirmShop } from './step-confirm-shop';
import { StepAddMachine } from './step-add-machine';
import { StepTestSms } from './step-test-sms';

type Step = 1 | 2 | 3;

interface OnboardingWizardProps {
  initialShopName: string;
  initialContactNumber: string;
  hasMachine: boolean;
}

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: 'Preview' },
  { num: 2, label: 'Machine' },
  { num: 3, label: 'Test SMS' },
];

export function OnboardingWizard({
  initialShopName,
  initialContactNumber,
  hasMachine,
}: OnboardingWizardProps) {
  // If a machine already exists (e.g. user retried after partial completion), start at step 3.
  const [step, setStep] = useState<Step>(hasMachine ? 3 : 1);
  const [shopName, setShopName] = useState(initialShopName);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  // Focus the step container on step change so keyboard / screen-reader users
  // pick up that a new step is now active. The aria-live region below
  // additionally announces the textual step label.
  useEffect(() => {
    stepContainerRef.current?.focus();
  }, [step]);

  return (
    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d968b]" aria-hidden />

      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
        <h2 className="text-2xl font-bold text-[#111817]">Let&apos;s get you sending SMS today</h2>
        <p className="text-sm text-[#618986] mt-1">
          Three quick steps. Takes about a minute.
        </p>

        {/* Step indicator (aria-live announces the current step to assistive tech) */}
        <div className="flex items-center mt-6" aria-live="polite" aria-atomic="true">
          {STEPS.map((s, i) => (
            <div key={s.num} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'size-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    step >= s.num ? 'bg-[#0d968b] text-white' : 'bg-slate-200 text-slate-500'
                  )}
                  aria-current={step === s.num ? 'step' : undefined}
                >
                  {s.num}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold transition-colors hidden sm:inline',
                    step === s.num ? 'text-[#111817]' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full bg-[#0d968b] transition-all duration-300',
                      step > s.num ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={stepContainerRef}
        tabIndex={-1}
        className="px-6 sm:px-8 pb-6 sm:pb-8 outline-none"
      >
        {step === 1 && (
          <StepConfirmShop
            initialShopName={shopName}
            initialContactNumber={initialContactNumber}
            onContinue={(name) => {
              setShopName(name);
              setStep(2);
            }}
          />
        )}
        {step === 2 && <StepAddMachine onContinue={() => setStep(3)} />}
        {step === 3 && <StepTestSms shopName={shopName} />}
      </div>
    </div>
  );
}
