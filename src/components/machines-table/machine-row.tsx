'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Wrench } from 'lucide-react';
import type { Machine } from './types';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface MachineRowProps {
  machine: Machine;
  onEdit: (machine: Machine) => void;
  onDelete: (machine: Machine) => void;
}

function MachineRowComponent({ machine, onEdit, onDelete }: MachineRowProps) {
  return (
    <TableRow className="hover:bg-[#0d968b]/5 transition-colors">
      <TableCell className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-[#0d968b]/10 flex items-center justify-center text-[#0d968b] font-bold text-xs">
            {machine.label.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {machine.label}
            </span>
            {machine.machine_type && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-slate-500 border-slate-200">
                {machine.machine_type}
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-6 py-5">
        {machine.status === 'maintenance' ? (
          <Badge className="bg-orange-100 text-orange-700 border-transparent gap-1.5">
            <Wrench className="size-3" />
            Maintenance
          </Badge>
        ) : machine.operationalStatus === 'in_use' ? (
          <Badge className="bg-[#0d968b]/10 text-[#0d968b] border-transparent gap-1.5">
            <span className="size-2 rounded-full bg-[#0d968b] animate-pulse" />
            {machine.currentPhase
              ? `${machine.currentPhase.phaseType}${machine.currentPhase.claimNumber != null ? ` · #${machine.currentPhase.claimNumber}` : ''}`
              : 'In Use'}
          </Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-700 border-transparent gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            Available
          </Badge>
        )}
      </TableCell>
      <TableCell className="px-6 py-5">
        <span className="text-sm font-medium text-slate-700">
          {machine.cyclesToday}
        </span>
      </TableCell>
      <TableCell className="px-6 py-5">
        <span className="text-sm text-slate-500">
          {formatRelativeTime(machine.lastActivityAt)}
        </span>
      </TableCell>
      <TableCell className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(machine)}
            aria-label={`Edit ${machine.label}`}
            className="text-slate-400 hover:text-[#0d968b] hover:bg-[#0d968b]/10 min-h-11 min-w-11"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(machine)}
            aria-label={`Delete ${machine.label}`}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 min-h-11 min-w-11"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export const MachineRow = React.memo(MachineRowComponent, (prev, next) => {
  return (
    prev.machine.id === next.machine.id &&
    prev.machine.label === next.machine.label &&
    prev.machine.status === next.machine.status &&
    prev.machine.machine_type === next.machine.machine_type &&
    prev.machine.operationalStatus === next.machine.operationalStatus &&
    prev.machine.cyclesToday === next.machine.cyclesToday &&
    prev.machine.lastActivityAt === next.machine.lastActivityAt &&
    prev.machine.currentPhase?.jobId === next.machine.currentPhase?.jobId &&
    prev.machine.currentPhase?.phaseType === next.machine.currentPhase?.phaseType &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete
  );
});
