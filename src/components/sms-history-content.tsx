'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';

interface SmsLog {
  id: string;
  sent_at: string;
  status: string;
  provider: string;
  notification_type: 'queue' | 'completion';
  customer_phone_masked: string | null;
  machine_label: string | null;
}

interface SmsHistoryContentProps {
  logs: SmsLog[];
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
  return { datePart, timePart };
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'sent') {
    return (
      <Badge className="bg-[#0d968b]/10 text-[#0d968b] border-transparent font-semibold">
        Sent
      </Badge>
    );
  }
  if (status === 'delivered') {
    return (
      <Badge className="bg-teal-100 text-teal-700 border-transparent font-semibold">
        Delivered
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge className="bg-red-100 text-red-700 border-transparent font-semibold">
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 text-slate-500 border-transparent font-semibold capitalize">
      {status}
    </Badge>
  );
}

export function SmsHistoryContent({ logs }: SmsHistoryContentProps) {
  if (logs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">SMS History</h2>
          <p className="text-slate-500 mt-2">View the last 100 SMS notifications sent to customers.</p>
        </header>
        <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
          <EmptyState
            icon="sms"
            title="No SMS sent yet"
            description="SMS notifications will appear here once you complete jobs with SMS enabled."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">SMS History</h2>
        <p className="text-slate-500 mt-2">View the last 100 SMS notifications sent to customers.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date / Time
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Machine
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Phone
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Type
              </TableHead>
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const { datePart, timePart } = formatDateTime(log.sent_at);
              return (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4 text-sm text-slate-700">
                    <span className="font-medium">{datePart}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{timePart}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm font-bold text-slate-700">
                    {log.machine_label ?? <span className="text-slate-400 italic font-normal">--</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600">
                    {log.customer_phone_masked ?? <span className="text-slate-400 italic">--</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600">
                    {log.notification_type === 'queue' ? (
                      <Badge className="bg-blue-100 text-blue-700 border-transparent font-semibold">
                        Queue
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border-transparent font-semibold">
                        Completion
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <StatusBadge status={log.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
