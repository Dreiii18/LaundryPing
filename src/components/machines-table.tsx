'use client';

import { useState } from 'react';
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
import { Loader2, Plus, Pencil, Trash2, Droplets, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';

interface Machine {
  id: string;
  label: string;
  type: 'washer' | 'dryer';
  status: string;
  created_at: string;
}

interface MachinesTableProps {
  machines: Machine[];
}

export function MachinesTable({ machines: initialMachines }: MachinesTableProps) {
  const router = useRouter();

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
        // Update
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
        // Create
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

      {/* Table */}
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
        <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Label
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialMachines.map((machine) => (
                <TableRow key={machine.id} className="hover:bg-[#0d968b]/5 transition-colors">
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
                      <span className="text-sm font-medium capitalize">{machine.type}</span>
                    </div>
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
        </div>
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
