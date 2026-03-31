export interface Machine {
  id: string;
  label: string;
  status: string;
  created_at: string;
  operationalStatus: 'available' | 'in_use';
  cyclesToday: number;
  lastActivityAt: string | null;
}

export interface MachinesTableProps {
  machines: Machine[];
}

export type SortField = 'label' | 'operationalStatus' | 'cyclesToday' | 'lastActivityAt';
export type SortDirection = 'asc' | 'desc';

export const PAGE_SIZE = 10;
