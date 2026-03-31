'use client';

import { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { LaundryRow } from './use-admin-topup';

interface LaundromatTableProps {
  laundromats: LaundryRow[];
  search: string;
  onTopUp: (row: LaundryRow) => void;
}

export function LaundromatTable({ laundromats, search, onTopUp }: LaundromatTableProps) {
  const filtered = laundromats.filter((row) => {
    const q = search.toLowerCase();
    return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
  });

  const handleTopUp = useCallback(
    (row: LaundryRow) => () => onTopUp(row),
    [onTopUp]
  );

  return (
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
                    <span
                      className={`font-semibold ${
                        total === 0
                          ? 'text-red-600'
                          : total <= 10
                            ? 'text-amber-600'
                            : 'text-slate-900'
                      }`}
                    >
                      {total}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTopUp(row)}
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
  );
}
