'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';

export function useBlogActions() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleRequestDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteId(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/blog/${deleteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete post');
        return;
      }

      toast.success('Post deleted');
      setDeleteId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  }, [deleteId, router, startTransition]);

  return {
    search,
    setSearch,
    deleteId,
    deleting,
    handleRequestDelete,
    handleCancelDelete,
    handleDelete,
  };
}
