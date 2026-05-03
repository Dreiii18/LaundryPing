export type MachineType = 'washer' | 'dryer' | 'combo' | 'other';

export interface Machine {
  id: string;
  label: string;
  status: string;
  machine_type: MachineType;
  created_at: string;
  operationalStatus: 'available' | 'in_use';
  cyclesToday: number;
  lastActivityAt: string | null;
  currentPhase: { jobId: string; claimNumber: number | null; phaseType: string } | null;
}

export interface MachinesTableProps {
  machines: Machine[];
}

export type SortField = 'label' | 'operationalStatus' | 'cyclesToday' | 'lastActivityAt' | 'machine_type';
export type SortDirection = 'asc' | 'desc';

export const PAGE_SIZE = 10;
