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

interface SmsPlan {
  id: string;
  tier: 'starter' | 'growth' | 'scale';
  label: string;
  sms_limit: number;
  price_php: number;
}

interface LaundryRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  plan_tier: string | null;
  plan_label: string | null;
  sms_used_this_month: number;
  sms_limit: number;
  sms_plan_expires_at: string | null;
}

interface AdminPlansContentProps {
  laundromats: LaundryRow[];
  plans: SmsPlan[];
}

function getPlanStatus(row: LaundryRow) {
  if (!row.plan_tier || !row.sms_plan_expires_at) {
    return { label: 'No Plan', color: 'bg-slate-100 text-slate-600' };
  }
  const expiresAt = new Date(row.sms_plan_expires_at);
  const now = new Date();
  if (expiresAt < now) {
    return { label: 'Expired', color: 'bg-red-100 text-red-700' };
  }
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 7) {
    return { label: `Expiring (${daysLeft}d)`, color: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Active', color: 'bg-green-100 text-green-700' };
}

export function AdminPlansContent({ laundromats, plans }: AdminPlansContentProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<LaundryRow | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('starter');
  const [selectedDuration, setSelectedDuration] = useState<string>('30');
  const [loading, setLoading] = useState(false);

  const filtered = laundromats.filter((row) => {
    const q = search.toLowerCase();
    return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
  });

  const handleActivate = (row: LaundryRow) => {
    setSelectedRow(row);
    setSelectedTier(row.plan_tier || 'starter');
    setSelectedDuration('30');
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedRow) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/plans/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedRow.user_id,
          plan_tier: selectedTier,
          duration_days: parseInt(selectedDuration, 10),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to activate plan');
        return;
      }

      toast.success(`Plan activated for ${selectedRow.name}`);
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.tier === selectedTier);

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
              <TableHead>Plan</TableHead>
              <TableHead>SMS Usage</TableHead>
              <TableHead>Expiry</TableHead>
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
                const status = getPlanStatus(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-slate-500">{row.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {row.plan_label || status.label}
                        {row.plan_label && status.label !== 'No Plan' && (
                          <span className="ml-1">({status.label})</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.sms_limit > 0
                        ? `${row.sms_used_this_month} / ${row.sms_limit}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {row.sms_plan_expires_at
                        ? new Date(row.sms_plan_expires_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(row)}
                        className="text-[#0d968b] border-[#0d968b]/30 hover:bg-[#0d968b]/5"
                      >
                        Activate
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
            <DialogTitle>Activate SMS Plan</DialogTitle>
            <DialogDescription>
              Activate a plan for <strong>{selectedRow?.name}</strong> ({selectedRow?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Plan Tier</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.tier} value={plan.tier}>
                      {plan.label} — {plan.sms_limit} SMS/mo — PHP {plan.price_php}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan && (
                <p className="text-xs text-slate-500">
                  {selectedPlan.sms_limit} SMS/month at PHP {selectedPlan.price_php}/mo
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Duration</label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
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
              {loading ? 'Activating...' : 'Confirm Activation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
