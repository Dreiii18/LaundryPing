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

export interface Job {
  id: string;
  machine_id: string | null;
  customer_phone_masked: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  sms_sent: boolean;
  notify_sms: boolean;
  notify_queue_sms: boolean;
  notes: string | null;
  payment_method: string | null;
  pay_amount: number | null;
  cash_tendered: number | null;
  is_paid: boolean;
  is_overdue: boolean;
  overdue_reason: string | null;
  services: string[];
  claim_number: number | null;
  customer_name: string | null;
  priority: 'normal' | 'rush';
  created_at: string;
  machine: {
    id: string;
    label: string;
  } | null;
}

export interface ShopInfo {
  name: string;
  address: string | null;
  contactNumber: string | null;
  servicePrices: Record<string, number>;
}

export interface JobsTableProps {
  jobs: Job[];
  context?: 'dashboard' | 'jobs-page';
  shopInfo?: ShopInfo;
}
