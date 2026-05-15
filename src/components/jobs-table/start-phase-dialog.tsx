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

interface StartPhaseDialogProps {
  open: boolean;
  phaseType: string;
  machineId: string;
  starting: boolean;
  availableMachines: Machine[];
  loadingMachines: boolean;
  onMachineChange: (machineId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function StartPhaseDialog({
  open,
  phaseType,
  machineId,
  starting,
  availableMachines,
  loadingMachines,
  onMachineChange,
  onConfirm,
  onClose,
}: StartPhaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#111817]">
            Start {phaseType}
          </DialogTitle>
          <DialogDescription className="text-[#618986]">
            Select a machine for this phase. Only compatible machines are listed.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loadingMachines ? (
            <div className="h-12 flex items-center text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin mr-2" />
              Loading machines...
            </div>
          ) : availableMachines.length === 0 ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                No compatible machines available right now.
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full min-h-11"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <Label htmlFor="start-phase-machine" className="text-sm font-semibold text-[#111817]">Machine</Label>
              <Select value={machineId} onValueChange={onMachineChange}>
                <SelectTrigger id="start-phase-machine" className="w-full h-12 mt-2">
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
            disabled={!machineId || starting}
            onClick={onConfirm}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
          >
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting...
              </>
            ) : (
              `Start ${phaseType}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
