'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { JobsTable } from '@/components/jobs-table';
import { useJobsFiltering } from './use-jobs-filtering';
import { JobsFilter } from './jobs-filter';
import { JobsPagination } from './jobs-pagination';
import type { JobsPageContentProps } from './types';

export type { ShopInfo } from './types';

export function JobsPageContent({
  jobs,
  machines,
  totalCount,
  totalJobCount,
  currentPage,
  pageSize,
  currentFilters,
  shopInfo,
  servicePhaseConfig,
}: JobsPageContentProps) {
  const {
    searchInput,
    setSearchInput,
    hasFilters,
    totalPages,
    clearFilters,
    handleDateFromChange,
    handleDateToChange,
    handleStatusChange,
    handleMachineChange,
    handlePageChange,
  } = useJobsFiltering({ currentFilters, currentPage, totalCount, pageSize });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Jobs</h2>
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {totalJobCount} Total
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          placeholder="Search by tag #, name, phone, or notes..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      <JobsFilter
        currentFilters={currentFilters}
        machines={machines}
        hasFilters={hasFilters}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onStatusChange={handleStatusChange}
        onMachineChange={handleMachineChange}
        onClearFilters={clearFilters}
      />

      {/* Filtered count indicator */}
      {hasFilters && (
        <p className="text-sm text-slate-500 mb-4">
          Showing {totalCount} of {totalJobCount} jobs
        </p>
      )}

      <JobsTable jobs={jobs} context="jobs-page" shopInfo={shopInfo} servicePhaseConfig={servicePhaseConfig} />

      {totalCount > pageSize && (
        <JobsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
