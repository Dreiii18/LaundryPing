'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface TopupPackage {
  slug: string;
  label: string;
  sms_credits: number;
  price_php: number;
}

interface LaundryRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  sms_free_credits: number;
  sms_paid_credits: number;
}

interface AdminTopupContentProps {
  laundromats: LaundryRow[];
  packages: TopupPackage[];
}

export function AdminTopupContent({ laundromats, packages }: AdminTopupContentProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<LaundryRow | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('pack-250');
  const [loading, setLoading] = useState(false);

  const filtered = laundromats.filter((row) => {
    const q = search.toLowerCase();
    return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
  });

  const handleTopup = (row: LaundryRow) => {
    setSelectedRow(row);
    setSelectedPackage('pack-250');
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
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
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = packages.find((p) => p.slug === selectedPackage);

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
          {filtered.length} laundromat{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Laundromat</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Free Credits</TableHead>
              <TableHead>Paid Credits</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  No laundromats found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const total = row.sms_free_credits + row.sms_paid_credits;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-slate-500">{row.email}</TableCell>
                    <TableCell>{row.sms_free_credits}</TableCell>
                    <TableCell>{row.sms_paid_credits}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${total === 0 ? 'text-red-600' : total <= 10 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {total}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTopup(row)}
                        className="text-[#0d968b] border-[#0d968b]/30 hover:bg-[#0d968b]/5"
                      >
                        Top Up
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SMS Credits</DialogTitle>
            <DialogDescription>
              Add credits for <strong>{selectedRow?.name}</strong> ({selectedRow?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">SMS Package</label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.slug} value={pkg.slug}>
                      {pkg.label} — {pkg.sms_credits} credits — PHP {pkg.price_php}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPkg && (
                <p className="text-xs text-slate-500">
                  +{selectedPkg.sms_credits} SMS credits at PHP {selectedPkg.price_php}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white"
            >
              {loading ? 'Adding...' : 'Confirm Top-Up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
