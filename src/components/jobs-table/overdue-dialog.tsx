'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Job } from './types';

interface OverdueDialogProps {
  overdueJobId: string | null;
  overdueReason: string;
  jobs: Job[];
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function OverdueDialog({
  overdueJobId,
  overdueReason,
  jobs,
  onReasonChange,
  onConfirm,
  onClose,
}: OverdueDialogProps) {
  const job = overdueJobId ? jobs.find((j) => j.id === overdueJobId) : null;

  return (
    <Dialog open={overdueJobId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#111817]">
            Job Overdue
          </DialogTitle>
          <DialogDescription className="text-[#618986]">
            This job was started on{' '}
            {job
              ? new Date(job.started_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'Asia/Manila',
                })
              : ''}
            . Please provide a reason for the delay.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="overdue-reason" className="text-sm font-semibold text-[#111817]">Reason</Label>
          <Textarea
            id="overdue-reason"
            value={overdueReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Customer did not pick up on time, machine issue..."
            className="mt-2 min-h-[80px]"
          />
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
            disabled={!overdueReason.trim()}
            onClick={onConfirm}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
