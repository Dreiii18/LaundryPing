'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAdminTopup } from './use-admin-topup';
import { LaundromatTable } from './laundromats-table';
import { TopupDialog } from './topup-dialog';
import type { TopupPackage, LaundryRow } from './use-admin-topup';

interface AdminTopupContentProps {
  laundromats: LaundryRow[];
  packages: TopupPackage[];
}

export function AdminTopupContent({ laundromats, packages }: AdminTopupContentProps) {
  const {
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
  } = useAdminTopup();

  const filteredCount = laundromats.filter((row) => {
    const q = search.toLowerCase();
    return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-slate-500">
          {filteredCount} laundromat{filteredCount !== 1 ? 's' : ''}
        </p>
      </div>

      <LaundromatTable
        laundromats={laundromats}
        search={search}
        onTopUp={handleTopup}
      />

      <TopupDialog
        open={dialogOpen}
        selectedLaundromat={selectedRow}
        packages={packages}
        selectedPackage={selectedPackage}
        loading={loading}
        onPackageChange={setSelectedPackage}
        onConfirm={handleConfirm}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
