export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

export interface Machine {
  id: string;
  label: string;
}

export interface StartJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
