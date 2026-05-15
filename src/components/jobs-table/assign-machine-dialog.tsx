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
import { Loader2, X } from 'lucide-react';
import type { Machine } from './types';

interface AssignMachineDialogProps {
  open: boolean;
  phaseType: string;
  machineId: string;
  saving: boolean;
  availableMachines: Machine[];
  loadingMachines: boolean;
  hasExistingAssignment: boolean;
  onMachineChange: (machineId: string) => void;
  onConfirm: () => void;
  onUnassign: () => void;
  onClose: () => void;
}

export function AssignMachineDialog({
  open,
  phaseType,
  machineId,
  saving,
  availableMachines,
  loadingMachines,
  hasExistingAssignment,
  onMachineChange,
  onConfirm,
  onUnassign,
  onClose,
}: AssignMachineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#111817]">
            Pre-assign machine for {phaseType}
          </DialogTitle>
          <DialogDescription className="text-[#618986]">
            The phase stays queued. When you click Start, the assigned machine is used directly — no extra dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loadingMachines ? (
            <div className="h-12 flex items-center text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin mr-2" />
              Loading machines...
            </div>
          ) : availableMachines.length === 0 ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              No compatible machines right now.
            </div>
          ) : (
            <>
              <Label htmlFor="assign-machine-select" className="text-sm font-semibold text-[#111817]">Machine</Label>
              <Select value={machineId} onValueChange={onMachineChange}>
                <SelectTrigger id="assign-machine-select" className="w-full h-12 mt-2">
                  <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}{m.machine_type ? ` (${m.machine_type})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <DialogFooter className="flex-row sm:justify-between">
          <div>
            {hasExistingAssignment && (
              <Button
                type="button"
                variant="ghost"
                onClick={onUnassign}
                disabled={saving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-11"
              >
                <X className="size-4" />
                Unassign
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
              disabled={!machineId || saving}
              onClick={onConfirm}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Pre-assign'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
