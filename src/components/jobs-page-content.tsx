'use client';

import { useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { JobsTable, type Job } from '@/components/jobs-table';

const PAGE_SIZE = 15;

interface Machine {
  id: string;
  label: string;
  type: 'washer' | 'dryer';
}

interface JobsPageContentProps {
  jobs: Job[];
  machines: Machine[];
}

export function JobsPageContent({ jobs, machines }: JobsPageContentProps) {
  const [statusTab, setStatusTab] = useState('all');
  const [machineId, setMachineId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const hasFilters = statusTab !== 'all' || machineId !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusTab('all');
    setMachineId('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Status filter
    if (statusTab === 'in_progress') {
      result = result.filter((j) => j.status === 'in_progress');
    } else if (statusTab === 'completed') {
      result = result.filter((j) => j.status === 'completed');
    } else if (statusTab === 'cancelled') {
      result = result.filter((j) => j.status === 'cancelled');
    }

    // Machine filter
    if (machineId !== 'all') {
      result = result.filter((j) => j.machine?.id === machineId);
    }

    // Date range filter (using PH timezone)
    if (dateFrom) {
      const fromStart = `${dateFrom}T00:00:00+08:00`;
      result = result.filter((j) => j.started_at >= fromStart);
    }
    if (dateTo) {
      // Include the entire "to" day
      const toEnd = `${dateTo}T23:59:59+08:00`;
      result = result.filter((j) => j.started_at <= toEnd);
    }

    return result;
  }, [jobs, statusTab, machineId, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredJobs.length);
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  const handleStatusChange = (value: string) => {
    setStatusTab(value);
    setCurrentPage(1);
  };

  const handleMachineChange = (value: string) => {
    setMachineId(value);
    setCurrentPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setCurrentPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Jobs</h2>
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {jobs.length} Total
        </Badge>
      </div>

      {/* Date range inputs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <label htmlFor="date-from" className="text-sm font-medium text-slate-500 shrink-0">From</label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <label htmlFor="date-to" className="text-sm font-medium text-slate-500 shrink-0">To</label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Status tabs + machine type + clear */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <Tabs value={statusTab} onValueChange={handleStatusChange} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            {/* <TabsTrigger value="cancelled">Cancelled</TabsTrigger> */}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select value={machineId} onValueChange={handleMachineChange}>
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
          Showing {filteredJobs.length} of {jobs.length} jobs
        </p>
      )}

      {/* Jobs table */}
      <JobsTable jobs={paginatedJobs} context="jobs-page" />

      {/* Pagination */}
      {filteredJobs.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2 py-4 mt-4">
          <p className="text-sm text-slate-500">
            Showing {startIndex + 1} to {endIndex} of {filteredJobs.length} jobs
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="size-8"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === safePage ? 'default' : 'outline'}
                size="icon"
                onClick={() => setCurrentPage(page)}
                className={`size-8 text-xs ${
                  page === safePage
                    ? 'bg-[#0d968b] hover:bg-[#0d968b]/90 text-white'
                    : ''
                }`}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
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
