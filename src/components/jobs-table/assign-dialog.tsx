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
import { Loader2 } from 'lucide-react';
import type { Machine } from './types';

interface AssignDialogProps {
  assignJobId: string | null;
  assignMachineId: string;
  assigningMachine: boolean;
  availableMachines: Machine[];
  loadingMachines: boolean;
  onMachineChange: (machineId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function AssignDialog({
  assignJobId,
  assignMachineId,
  assigningMachine,
  availableMachines,
  loadingMachines,
  onMachineChange,
  onConfirm,
  onClose,
}: AssignDialogProps) {
  return (
    <Dialog open={assignJobId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#111817]">
            Assign Machine
          </DialogTitle>
          <DialogDescription className="text-[#618986]">
            Select a machine to assign to this job.
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
              No available machines right now.
            </div>
          ) : (
            <>
              <Label htmlFor="assign-machine" className="text-sm font-semibold text-[#111817]">Machine</Label>
              <Select value={assignMachineId} onValueChange={onMachineChange}>
                <SelectTrigger id="assign-machine" className="w-full h-12 mt-2">
                  <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
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
            disabled={!assignMachineId || assigningMachine}
            onClick={onConfirm}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
          >
            {assigningMachine ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Machine'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
