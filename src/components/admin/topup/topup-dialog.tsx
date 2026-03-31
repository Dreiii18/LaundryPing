'use client';

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
import { Button } from '@/components/ui/button';
import type { LaundryRow, TopupPackage } from './use-admin-topup';

interface TopupDialogProps {
  open: boolean;
  selectedLaundromat: LaundryRow | null;
  packages: TopupPackage[];
  selectedPackage: string;
  loading: boolean;
  onPackageChange: (slug: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function TopupDialog({
  open,
  selectedLaundromat,
  packages,
  selectedPackage,
  loading,
  onPackageChange,
  onConfirm,
  onClose,
}: TopupDialogProps) {
  const selectedPkg = packages.find((p) => p.slug === selectedPackage);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add SMS Credits</DialogTitle>
          <DialogDescription>
            Add credits for <strong>{selectedLaundromat?.name}</strong> ({selectedLaundromat?.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">SMS Package</label>
            <Select value={selectedPackage} onValueChange={onPackageChange}>
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
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white"
          >
            {loading ? 'Adding...' : 'Confirm Top-Up'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
