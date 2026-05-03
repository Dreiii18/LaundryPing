'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  // SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Activity,
  Wrench,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

import type { MachinesTableProps, SortField, SortDirection } from './types';
import { PAGE_SIZE } from './types';
import { useMachinesActions } from './use-machines-actions';
import { MachineRow } from './machine-row';
import { MachineModal } from './machine-modal';
import { DeleteDialog } from './delete-dialog';

export function MachinesTable({ machines: initialMachines }: MachinesTableProps) {
  // Search, filter, sort, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortField, setSortField] = useState<SortField>('label');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    modalOpen,
    editingMachine,
    label,
    status,
    machineType,
    modalError,
    saving,
    deleteOpen,
    deletingMachine,
    deleting,
    deleteError,
    setModalOpen,
    setDeleteOpen,
    setLabel,
    setStatus,
    setMachineType,
    openAddModal,
    openEditModal,
    openDeleteDialog,
    handleSave,
    handleDelete,
  } = useMachinesActions();

  // Summary stats (computed from ALL machines, not filtered)
  const availableCount = initialMachines.filter(
    (m) => m.operationalStatus === 'available'
  ).length;
  const runningCount = initialMachines.filter(
    (m) => m.operationalStatus === 'in_use'
  ).length;
  const maintenanceCount = initialMachines.filter(
    (m) => m.status === 'maintenance'
  ).length;

  // Filtered machines
  const filteredMachines = useMemo(() => {
    let result = initialMachines;

    // Tab filter
    if (activeTab === 'maintenance') {
      result = result.filter((m) => m.status === 'maintenance');
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.label.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'label':
          return dir * a.label.localeCompare(b.label);
        case 'operationalStatus':
          return dir * a.operationalStatus.localeCompare(b.operationalStatus);
        case 'cyclesToday':
          return dir * (a.cyclesToday - b.cyclesToday);
        case 'lastActivityAt': {
          // Nulls always sort last regardless of direction
          if (!a.lastActivityAt && !b.lastActivityAt) return 0;
          if (!a.lastActivityAt) return 1;
          if (!b.lastActivityAt) return -1;
          return dir * (new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime());
        }
        default:
          return 0;
      }
    });

    return result;
  }, [initialMachines, activeTab, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMachines.length);
  const paginatedMachines = filteredMachines.slice(startIndex, endIndex);

  // Reset page on search/tab change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }, [sortField]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Machines</h2>
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {initialMachines.length} Total
          </Badge>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm min-h-11"
        >
          <Plus className="size-4" />
          Add Machine
        </Button>
      </div>

      {initialMachines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10">
          <EmptyState
            icon="machines"
            title="Add your first machine"
            description="Set up your machines to start tracking laundry jobs."
            action={{ label: 'Add Machine', onClick: openAddModal }}
          />
        </div>
      ) : (
        <>
          {/* Search + Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search machines..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            {/* <Button variant="outline" size="default" className="h-10 gap-2 text-slate-600" disabled>
              <SlidersHorizontal className="size-4" />
              Filters
            </Button> */}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Machines</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
            {filteredMachines.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No machines found matching your search.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      {([
                        ['label', 'Label'],
                        ['operationalStatus', 'Status'],
                        ['cyclesToday', 'Cycles Today'],
                        ['lastActivityAt', 'Last Activity'],
                      ] as const).map(([field, colLabel]) => (
                        <TableHead key={field} className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleSort(field)}
                            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider cursor-pointer select-none text-slate-400 hover:text-slate-600 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 rounded-sm"
                          >
                            {colLabel}
                            {sortField === field ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="size-3.5" />
                              ) : (
                                <ArrowDown className="size-3.5" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3.5 text-slate-300" />
                            )}
                          </button>
                        </TableHead>
                      ))}
                      <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMachines.map((machine) => (
                      <MachineRow
                        key={machine.id}
                        machine={machine}
                        onEdit={openEditModal}
                        onDelete={openDeleteDialog}
                      />
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {filteredMachines.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Showing {startIndex + 1} to {endIndex} of{' '}
                      {filteredMachines.length} machines
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
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
                        )
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={safePage >= totalPages}
                        className="size-8"
                        aria-label="Next page"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Available</p>
                  <p className="text-2xl font-bold text-slate-900">{availableCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-[#0d968b]/20">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[#0d968b]/10 flex items-center justify-center">
                  <Activity className="size-5 text-[#0d968b]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Currently Running</p>
                  <p className="text-2xl font-bold text-slate-900">{runningCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Wrench className="size-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Maintenance Needed</p>
                  <p className="text-2xl font-bold text-slate-900">{maintenanceCount}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <MachineModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingMachine={editingMachine}
        label={label}
        onLabelChange={setLabel}
        status={status}
        onStatusChange={setStatus}
        machineType={machineType}
        onMachineTypeChange={setMachineType}
        onSave={handleSave}
        saving={saving}
        error={modalError}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteOpen}
        machineLabel={deletingMachine?.label}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        deleting={deleting}
        error={deleteError}
      />
    </>
  );
}

export type { MachinesTableProps } from './types';
