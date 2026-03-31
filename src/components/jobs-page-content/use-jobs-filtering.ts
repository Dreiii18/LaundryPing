'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { CurrentFilters } from './types';

interface UseJobsFilteringProps {
  currentFilters: CurrentFilters;
  currentPage: number;
  totalCount: number;
  pageSize: number;
}

export function useJobsFiltering({
  currentFilters,
  currentPage,
  totalCount,
  pageSize,
}: UseJobsFilteringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

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
        startTransition(() => {
          router.push(buildUrl({ search: searchInput, page: '1' }));
        });
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

  const clearFilters = useCallback(() => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname);
    });
  }, [pathname, router]);

  const handleDateFromChange = useCallback((value: string) => {
    startTransition(() => {
      router.push(buildUrl({ dateFrom: value, page: '1' }));
    });
  }, [buildUrl, router]);

  const handleDateToChange = useCallback((value: string) => {
    startTransition(() => {
      router.push(buildUrl({ dateTo: value, page: '1' }));
    });
  }, [buildUrl, router]);

  const handleStatusChange = useCallback((value: string) => {
    startTransition(() => {
      router.push(buildUrl({ status: value, page: '1' }));
    });
  }, [buildUrl, router]);

  const handleMachineChange = useCallback((value: string) => {
    startTransition(() => {
      router.push(buildUrl({ machineId: value, page: '1' }));
    });
  }, [buildUrl, router]);

  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      router.push(buildUrl({ page: String(page) }));
    });
  }, [buildUrl, router]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
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
  };
}
