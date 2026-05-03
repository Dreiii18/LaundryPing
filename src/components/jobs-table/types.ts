export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

export type MachineType = 'washer' | 'dryer' | 'combo' | 'other';

export interface Machine {
  id: string;
  label: string;
  machine_type?: MachineType;
}

export type JobStatus = 'pending' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface JobPhase {
  id: string;
  phase_type: string;
  machine_id: string | null;
  sequence: number;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
  machine: {
    id: string;
    label: string;
    machine_type?: MachineType;
  } | null;
}

export interface Job {
  id: string;
  machine_id: string | null;
  customer_phone_masked: string | null;
  status: JobStatus;
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
  service_quantities: Record<string, number> | null;
  service_weights_actual: Record<string, number> | null;
  total_weight: number | null;
  claim_number: number | null;
  customer_name: string | null;
  priority: 'normal' | 'rush';
  created_at: string;
  machine: {
    id: string;
    label: string;
    machine_type?: MachineType;
  } | null;
  phases?: JobPhase[];
}

import type { ShopInfo } from '@/types/shop';
export type { ShopInfo };

export interface JobsTableProps {
  jobs: Job[];
  context?: 'dashboard' | 'jobs-page';
  shopInfo?: ShopInfo;
}
