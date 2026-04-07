'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2, AlertCircle } from 'lucide-react';
import { usePrinter } from './printer-provider';

interface PrinterConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrinterConnectDialog({ open, onOpenChange }: PrinterConnectDialogProps) {
  const { status, error, connect } = usePrinter();
  const isConnecting = status === 'connecting';
  const wasConnecting = useRef(false);

  // Close dialog when connection succeeds
  useEffect(() => {
    if (wasConnecting.current && status === 'connected') {
      onOpenChange(false);
    }
    wasConnecting.current = status === 'connecting';
  }, [status, onOpenChange]);

  const handleScan = async () => {
    await connect();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="size-5 text-[#0d968b]" />
            Connect Printer
          </DialogTitle>
          <DialogDescription>
            Make sure your thermal printer is powered on and Bluetooth is enabled on your device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-lg border border-[#0d968b]/10 bg-[#0d968b]/5 p-4 text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-700">Before scanning:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Turn on your thermal printer</li>
              <li>Enable Bluetooth on this device</li>
              <li>Stay within range (about 10 meters)</li>
            </ul>
          </div>

          <Button
            onClick={handleScan}
            disabled={isConnecting}
            className="w-full bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
          >
            {isConnecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Scanning for printers...
              </>
            ) : (
              <>
                <Bluetooth className="size-4" />
                Scan for printers
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-400">
            Works with Chrome and Edge browsers. Not supported on Safari or Firefox.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
