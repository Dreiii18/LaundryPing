'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';

export interface TopupPackage {
  slug: string;
  label: string;
  sms_credits: number;
  price_php: number;
}

export interface LaundryRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  sms_free_credits: number;
  sms_paid_credits: number;
}

export function useAdminTopup() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<LaundryRow | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('pack-250');
  const [loading, setLoading] = useState(false);

  const handleTopup = useCallback((row: LaundryRow) => {
    setSelectedRow(row);
    setSelectedPackage('pack-250');
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedRow) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laundromat_id: selectedRow.id,
          package_slug: selectedPackage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to add credits');
        return;
      }

      toast.success(`Credits added for ${selectedRow.name}`);
      setDialogOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedRow, selectedPackage, router, startTransition]);

  return {
    search,
    setSearch,
    dialogOpen,
    selectedRow,
    selectedPackage,
    setSelectedPackage,
    loading,
    handleTopup,
    handleCloseDialog,
    handleConfirm,
  };
}
