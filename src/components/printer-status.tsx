'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, BluetoothOff, Loader2 } from 'lucide-react';
import { usePrinter } from './printer-provider';
import { PrinterConnectDialog } from './printer-connect-dialog';

export function PrinterStatus() {
  const { status, deviceName, isSupported, disconnect } = usePrinter();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isSupported) return null;

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
        <Loader2 className="size-4 animate-spin" />
        <span className="hidden sm:inline">Connecting...</span>
      </div>
    );
  }

  if (status === 'connected' || status === 'printing') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-slate-600 hidden sm:inline truncate max-w-32">{deviceName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-9 min-w-9"
          onClick={disconnect}
          aria-label="Disconnect printer"
          title="Disconnect printer"
        >
          <BluetoothOff className="size-4 text-slate-400" />
        </Button>
      </div>
    );
  }

  // disconnected or error
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-slate-500 hover:text-[#0d968b] min-h-9"
        onClick={() => setDialogOpen(true)}
        title="Connect Bluetooth printer"
      >
        <Bluetooth className="size-4" />
        <span className="hidden sm:inline">Printer</span>
      </Button>
      <PrinterConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
