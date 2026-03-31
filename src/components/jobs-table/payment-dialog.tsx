'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PAYMENT_METHODS } from './types';

interface PaymentDialogProps {
  payLaterJobId: string | null;
  payLaterMethod: string;
  onMethodChange: (method: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function PaymentDialog({
  payLaterJobId,
  payLaterMethod,
  onMethodChange,
  onConfirm,
  onClose,
}: PaymentDialogProps) {
  return (
    <Dialog open={payLaterJobId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#111817]">
            Collect Payment
          </DialogTitle>
          <DialogDescription className="text-[#618986]">
            Select the payment method used by the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="pay-later-method" className="text-sm font-semibold text-[#111817]">Payment Method</Label>
          <Select value={payLaterMethod} onValueChange={onMethodChange}>
            <SelectTrigger id="pay-later-method" className="w-full h-12 mt-2">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!payLaterMethod}
            onClick={onConfirm}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
          >
            Confirm & Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
