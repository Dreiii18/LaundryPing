'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { JobsTable, type Job } from '@/components/jobs-table';

interface Machine {
  id: string;
  label: string;
  type: 'washer' | 'dryer';
}

interface JobsPageContentProps {
  jobs: Job[];
  machines: Machine[];
  totalCount: number;
  totalJobCount: number;
  currentPage: number;
  pageSize: number;
  currentFilters: {
    status: string;
    machineId: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
}

export function JobsPageContent({
  jobs,
  machines,
  totalCount,
  totalJobCount,
  currentPage,
  pageSize,
  currentFilters,
}: JobsPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Local state only for the search input to support debounce
  const [searchInput, setSearchInput] = useState(currentFilters.search);

  // Keep searchInput in sync when URL-driven filter changes (e.g. clear filters)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync local input with URL-driven prop
    setSearchInput(currentFilters.search);
  }, [currentFilters.search]);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const merged = {
        ...currentFilters,
        page: String(currentPage),
        ...overrides,
      };
      for (const [key, value] of Object.entries(merged)) {
        if (value && value !== 'all' && value !== '1' && value !== '') {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [currentFilters, currentPage, pathname]
  );

  // Debounce search navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentFilters.search) {
        router.push(buildUrl({ search: searchInput, page: '1' }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, currentFilters.search, buildUrl, router]);

  const hasFilters =
    currentFilters.status !== 'all' ||
    currentFilters.machineId !== 'all' ||
    currentFilters.dateFrom !== '' ||
    currentFilters.dateTo !== '' ||
    currentFilters.search.trim() !== '';

  const clearFilters = () => {
    setSearchInput('');
    router.push(pathname);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

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
          placeholder="Search by phone or notes..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Date range inputs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <label htmlFor="date-from" className="text-sm font-medium text-slate-500 shrink-0">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={currentFilters.dateFrom}
            onChange={(e) => router.push(buildUrl({ dateFrom: e.target.value, page: '1' }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <label htmlFor="date-to" className="text-sm font-medium text-slate-500 shrink-0">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={currentFilters.dateTo}
            onChange={(e) => router.push(buildUrl({ dateTo: e.target.value, page: '1' }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Status tabs + machine select + clear */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <Tabs
          value={currentFilters.status}
          onValueChange={(value) => router.push(buildUrl({ status: value, page: '1' }))}
          className="flex-1"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Queued</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select
            value={currentFilters.machineId}
            onValueChange={(value) => router.push(buildUrl({ machineId: value, page: '1' }))}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All machines</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-slate-700 gap-1 min-h-10"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filtered count indicator */}
      {hasFilters && (
        <p className="text-sm text-slate-500 mb-4">
          Showing {totalCount} of {totalJobCount} jobs
        </p>
      )}

      {/* Jobs table */}
      <JobsTable jobs={jobs} context="jobs-page" />

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between px-2 py-4 mt-4">
          <p className="text-sm text-slate-500">
            Showing {startIndex} to {endIndex} of {totalCount} jobs
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(buildUrl({ page: String(currentPage - 1) }))}
              disabled={currentPage <= 1}
              className="size-8"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === currentPage ? 'default' : 'outline'}
                size="icon"
                onClick={() => router.push(buildUrl({ page: String(p) }))}
                className={`size-8 text-xs ${
                  p === currentPage ? 'bg-[#0d968b] hover:bg-[#0d968b]/90 text-white' : ''
                }`}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(buildUrl({ page: String(currentPage + 1) }))}
              disabled={currentPage >= totalPages}
              className="size-8"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
