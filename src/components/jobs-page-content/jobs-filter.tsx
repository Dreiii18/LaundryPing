'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { JobsFilterProps } from './types';

export function JobsFilter({
  currentFilters,
  machines,
  hasFilters,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onMachineChange,
  onClearFilters,
}: JobsFilterProps) {
  return (
    <>
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
            onChange={(e) => onDateFromChange(e.target.value)}
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
            onChange={(e) => onDateToChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Status tabs + machine select + clear */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <Tabs
          value={currentFilters.status}
          onValueChange={onStatusChange}
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
          <Select value={currentFilters.machineId} onValueChange={onMachineChange}>
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
              onClick={onClearFilters}
              className="text-xs text-slate-500 hover:text-slate-700 gap-1 min-h-10"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
