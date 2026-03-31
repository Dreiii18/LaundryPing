'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import type { Machine } from './types';

export interface MachinesActionsState {
  modalOpen: boolean;
  editingMachine: Machine | null;
  label: string;
  status: 'active' | 'maintenance';
  modalError: string;
  saving: boolean;
  deleteOpen: boolean;
  deletingMachine: Machine | null;
  deleting: boolean;
  deleteError: string;
  isPending: boolean;
}

export interface MachinesActionsHandlers {
  setModalOpen: (open: boolean) => void;
  setDeleteOpen: (open: boolean) => void;
  setLabel: (label: string) => void;
  setStatus: (status: 'active' | 'maintenance') => void;
  openAddModal: () => void;
  openEditModal: (machine: Machine) => void;
  openDeleteDialog: (machine: Machine) => void;
  handleSave: (e: React.FormEvent) => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useMachinesActions(): MachinesActionsState & MachinesActionsHandlers {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'active' | 'maintenance'>('active');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const openAddModal = useCallback(() => {
    setEditingMachine(null);
    setLabel('');
    setStatus('active');
    setModalError('');
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((machine: Machine) => {
    setEditingMachine(machine);
    setLabel(machine.label);
    setStatus(machine.status === 'maintenance' ? 'maintenance' : 'active');
    setModalError('');
    setModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((machine: Machine) => {
    setDeletingMachine(machine);
    setDeleteError('');
    setDeleteOpen(true);
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
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
        const res = await fetchWithAuth(`/api/machines/${editingMachine.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: label.trim(), status }),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || 'Failed to update machine');
          setSaving(false);
          return;
        }
        toast.success('Machine updated successfully');
      } else {
        const res = await fetchWithAuth('/api/machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: label.trim() }),
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
      startTransition(() => { router.refresh(); });
    } catch {
      setModalError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }, [editingMachine, label, status, router]);

  const handleDelete = useCallback(async () => {
    if (!deletingMachine) return;
    setDeleteError('');
    setDeleting(true);

    try {
      const res = await fetchWithAuth(`/api/machines/${deletingMachine.id}`, {
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
      startTransition(() => { router.refresh(); });
    } catch {
      setDeleteError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  }, [deletingMachine, router]);

  return {
    modalOpen,
    editingMachine,
    label,
    status,
    modalError,
    saving,
    deleteOpen,
    deletingMachine,
    deleting,
    deleteError,
    isPending,
    setModalOpen,
    setDeleteOpen,
    setLabel,
    setStatus,
    openAddModal,
    openEditModal,
    openDeleteDialog,
    handleSave,
    handleDelete,
  };
}
