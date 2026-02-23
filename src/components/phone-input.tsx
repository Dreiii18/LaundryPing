'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { isValidPhNumber } from '@/lib/utils/phone';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, error, disabled }: PhoneInputProps) {
  const [touched, setTouched] = useState(false);

  const formatPhone = useCallback((input: string) => {
    const digits = input.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 11) {
      onChange(raw);
    }
  };

  const isValid = value.length === 0 || isValidPhNumber(value);
  const showError = touched && value.length > 0 && !isValid;

  return (
    <div>
      <Input
        type="tel"
        inputMode="numeric"
        placeholder="09171234567"
        value={formatPhone(value)}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        aria-invalid={showError || !!error}
        aria-describedby={showError || error ? 'phone-error' : undefined}
        className={`h-12 min-h-11 ${showError || error ? 'border-red-500 focus-visible:ring-red-500' : isValid && value.length === 11 && touched ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
      />
      {(showError || error) && (
        <p id="phone-error" className="text-sm text-red-500 mt-1" role="alert">
          {error || 'Please enter a valid PH mobile number (e.g., 09171234567)'}
        </p>
      )}
    </div>
  );
}
