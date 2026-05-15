'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench } from 'lucide-react';
import type { Machine, MachineType } from './types';

interface MachineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMachine: Machine | null;
  label: string;
  onLabelChange: (label: string) => void;
  status: 'active' | 'maintenance';
  onStatusChange: (status: 'active' | 'maintenance') => void;
  machineType: MachineType;
  onMachineTypeChange: (machineType: MachineType) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  error: string;
}

export function MachineModal({
  open,
  onOpenChange,
  editingMachine,
  label,
  onLabelChange,
  status,
  onStatusChange,
  machineType,
  onMachineTypeChange,
  onSave,
  saving,
  error,
}: MachineModalProps) {
  const [keyboardShift, setKeyboardShift] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return () => { setKeyboardShift(0); };
    const onResize = () => {
      const kbHeight = window.innerHeight - vv.height;
      setKeyboardShift(kbHeight > 100 ? kbHeight / 2 : 0);
    };
    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      setKeyboardShift(0);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-105"
        style={{
          transition: 'top 0.2s ease-out',
          ...(keyboardShift > 0 && { top: `calc(50% - ${keyboardShift}px)` }),
        }}
      >
        <form onSubmit={onSave}>
          <DialogHeader>
            <DialogTitle>
              {editingMachine ? 'Edit Machine' : 'Add Machine'}
            </DialogTitle>
            <DialogDescription>
              {editingMachine
                ? 'Update the machine label.'
                : 'Add a new machine to your laundromat.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Label</Label>
              <Input
                placeholder="e.g., Machine 1, M-01"
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                maxLength={20}
                className="h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Machine type</Label>
              <Select
                value={machineType}
                onValueChange={(v) => onMachineTypeChange(v as MachineType)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="washer">Washer</SelectItem>
                  <SelectItem value="dryer">Dryer</SelectItem>
                  <SelectItem value="combo">Combo (washer + dryer)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Combo machines can serve any phase. Washers / dryers can only serve their matching phase.
              </p>
            </div>

            {editingMachine && (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => onStatusChange(v as 'active' | 'maintenance')}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">
                      <div className="flex items-center gap-2">
                        <Wrench className="size-4" />
                        Maintenance
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : editingMachine ? (
                'Save Changes'
              ) : (
                'Add Machine'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
