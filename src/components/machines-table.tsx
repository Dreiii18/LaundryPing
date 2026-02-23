'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Droplets,
  Wind,
  Search,
  // SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Activity,
  // Wrench,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';

interface Machine {
  id: string;
  label: string;
  type: 'washer' | 'dryer';
  status: string;
  created_at: string;
  operationalStatus: 'available' | 'in_use';
  cyclesToday: number;
  lastActivityAt: string | null;
}

interface MachinesTableProps {
  machines: Machine[];
}

type SortField = 'label' | 'type' | 'operationalStatus' | 'cyclesToday' | 'lastActivityAt';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 10;

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function MachinesTable({ machines: initialMachines }: MachinesTableProps) {
  const router = useRouter();

  // Search, filter, sort, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortField, setSortField] = useState<SortField>('label');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Add/Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'washer' | 'dryer'>('washer');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Summary stats (computed from ALL machines, not filtered)
  const availableCount = initialMachines.filter(
    (m) => m.operationalStatus === 'available'
  ).length;
  const runningCount = initialMachines.filter(
    (m) => m.operationalStatus === 'in_use'
  ).length;
  // const maintenanceCount = 0;

  // Filtered machines
  const filteredMachines = useMemo(() => {
    let result = initialMachines;

    // Tab filter
    if (activeTab === 'washers') {
      result = result.filter((m) => m.type === 'washer');
    } else if (activeTab === 'dryers') {
      result = result.filter((m) => m.type === 'dryer');
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'label':
          return dir * a.label.localeCompare(b.label);
        case 'type':
          return dir * a.type.localeCompare(b.type);
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
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setEditingMachine(null);
    setLabel('');
    setType('washer');
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (machine: Machine) => {
    setEditingMachine(machine);
    setLabel(machine.label);
    setType(machine.type);
    setModalError('');
    setModalOpen(true);
  };

  const openDeleteDialog = (machine: Machine) => {
    setDeletingMachine(machine);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!label.trim()) {
      setModalError('Label is required');
      return;
    }
    if (label.trim().length > 20) {
      setModalError('Label must be 20 characters or less');
      return;
    }

    setSaving(true);

    try {
      if (editingMachine) {
        const res = await fetch(`/api/machines/${editingMachine.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: label.trim(), type }),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || 'Failed to update machine');
          setSaving(false);
          return;
        }
        toast.success('Machine updated successfully');
      } else {
        const res = await fetch('/api/machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: label.trim(), type }),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || 'Failed to create machine');
          setSaving(false);
          return;
        }
        toast.success('Machine added successfully');
      }

      setModalOpen(false);
      router.refresh();
    } catch {
      setModalError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMachine) return;
    setDeleteError('');
    setDeleting(true);

    try {
      const res = await fetch(`/api/machines/${deletingMachine.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete machine');
        setDeleting(false);
        return;
      }

      toast.success('Machine deleted successfully');
      setDeleteOpen(false);
      router.refresh();
    } catch {
      setDeleteError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

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
            description="Set up your washers and dryers to start tracking laundry jobs."
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
              <TabsTrigger value="washers">Washers</TabsTrigger>
              <TabsTrigger value="dryers">Dryers</TabsTrigger>
              {/* <TabsTrigger value="maintenance" disabled>
                Maintenance
              </TabsTrigger> */}
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
                        ['type', 'Type'],
                        ['operationalStatus', 'Status'],
                        ['cyclesToday', 'Cycles Today'],
                        ['lastActivityAt', 'Last Activity'],
                      ] as const).map(([field, label]) => (
                        <TableHead key={field} className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleSort(field)}
                            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider cursor-pointer select-none text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {label}
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
                      <TableRow
                        key={machine.id}
                        className="hover:bg-[#0d968b]/5 transition-colors"
                      >
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-[#0d968b]/10 flex items-center justify-center text-[#0d968b] font-bold text-xs">
                              {machine.label.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {machine.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-2 text-slate-600">
                            {machine.type === 'washer' ? (
                              <Droplets className="size-4" />
                            ) : (
                              <Wind className="size-4" />
                            )}
                            <span className="text-sm font-medium capitalize">
                              {machine.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-5">
                          {machine.operationalStatus === 'in_use' ? (
                            <Badge className="bg-[#0d968b]/10 text-[#0d968b] border-transparent gap-1.5">
                              <span className="size-2 rounded-full bg-[#0d968b] animate-pulse" />
                              In Use
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-transparent gap-1.5">
                              <span className="size-2 rounded-full bg-emerald-500" />
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-5">
                          <span className="text-sm font-medium text-slate-700">
                            {machine.cyclesToday}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5">
                          <span className="text-sm text-slate-500">
                            {formatRelativeTime(machine.lastActivityAt)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(machine)}
                              aria-label={`Edit ${machine.label}`}
                              className="text-slate-400 hover:text-[#0d968b] hover:bg-[#0d968b]/10 min-h-11 min-w-11"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(machine)}
                              aria-label={`Delete ${machine.label}`}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 min-h-11 min-w-11"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
            {/* <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Wrench className="size-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Maintenance Needed</p>
                  <p className="text-2xl font-bold text-slate-900">{maintenanceCount}</p>
                </div>
              </div>
            </div> */}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingMachine ? 'Edit Machine' : 'Add Machine'}
              </DialogTitle>
              <DialogDescription>
                {editingMachine
                  ? 'Update the machine label and type.'
                  : 'Add a new machine to your laundromat.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {modalError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Label</Label>
                <Input
                  placeholder="e.g., W1, Dryer 2"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={20}
                  className="h-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'washer' | 'dryer')}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="washer">
                      <div className="flex items-center gap-2">
                        <Droplets className="size-4" />
                        Washer
                      </div>
                    </SelectItem>
                    <SelectItem value="dryer">
                      <div className="flex items-center gap-2">
                        <Wind className="size-4" />
                        Dryer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="min-h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : editingMachine ? (
                  'Save Changes'
                ) : (
                  'Add Machine'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Machine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingMachine?.label}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
