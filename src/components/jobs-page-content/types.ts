export interface Machine {
  id: string;
  label: string;
}

import type { ShopInfo } from '@/types/shop';
export type { ShopInfo };

export interface CurrentFilters {
  status: string;
  machineId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export interface JobsPageContentProps {
  jobs: import('@/components/jobs-table').Job[];
  machines: Machine[];
  totalCount: number;
  totalJobCount: number;
  currentPage: number;
  pageSize: number;
  currentFilters: CurrentFilters;
  shopInfo?: ShopInfo;
}

export interface JobsFilterProps {
  currentFilters: CurrentFilters;
  machines: Machine[];
  hasFilters: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onMachineChange: (value: string) => void;
  onClearFilters: () => void;
}

export interface JobsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}
