'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { PrinterDevice, PrinterStatus } from '@/types/printer';
import type { ReceiptData } from '@/lib/utils/receipt';

const STORAGE_KEY = 'laundryping:printer:device';

interface PrinterContextValue {
  status: PrinterStatus;
  deviceName: string | null;
  error: string | null;
  isSupported: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printReceipt: (data: ReceiptData) => Promise<void>;
}

const PrinterContext = createContext<PrinterContextValue | null>(null);

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider');
  return ctx;
}

function loadStoredDevice(): PrinterDevice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PrinterDevice) : null;
  } catch {
    return null;
  }
}

function storeDevice(device: PrinterDevice | null): void {
  if (device) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(device));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PrinterStatus>('disconnected');
  const [printerDevice, setPrinterDevice] = useState<PrinterDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  // Stable ref for the disconnect handler to avoid stale closures
  const handleDisconnectRef = useRef<() => void>(() => {});

  // Check Web Bluetooth support on mount
  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  }, []);

  handleDisconnectRef.current = useCallback(() => {
    setStatus('disconnected');
    setPrinterDevice(null);
    bluetoothDeviceRef.current = null;
    toast.info('Printer disconnected');
  }, []);

  // Stable function reference for event listener (prevents duplicate registrations)
  const onGattDisconnected = useCallback(() => {
    handleDisconnectRef.current();
  }, []);

  // Auto-reconnect to previously paired device
  useEffect(() => {
    if (!isSupported) return;
    const stored = loadStoredDevice();
    if (!stored) return;

    let cancelled = false;
    (async () => {
      try {
        if (!navigator.bluetooth.getDevices) return;
        const devices = await navigator.bluetooth.getDevices();
        const device = devices.find((d) => d.id === stored.id);
        if (!device || cancelled) return;

        setStatus('connecting');
        bluetoothDeviceRef.current = device;

        const { connectToDevice } = await import('@/lib/bluetooth/connection');
        const connectedDevice = await connectToDevice(device);
        if (cancelled) return;

        setPrinterDevice(connectedDevice);
        storeDevice(connectedDevice);
        setStatus('connected');
        setError(null);

        device.addEventListener('gattserverdisconnected', onGattDisconnected);
      } catch {
        if (!cancelled) setStatus('disconnected');
      }
    })();

    return () => { cancelled = true; };
  }, [isSupported, onGattDisconnected]);

  const connect = useCallback(async () => {
    if (!isSupported) return;

    try {
      setStatus('connecting');
      setError(null);

      const { requestPrinterDevice, connectToDevice, disconnectDevice } = await import(
        '@/lib/bluetooth/connection'
      );
      const device = await requestPrinterDevice();

      // Clean up previous device listener if reconnecting
      if (bluetoothDeviceRef.current) {
        bluetoothDeviceRef.current.removeEventListener('gattserverdisconnected', onGattDisconnected);
        disconnectDevice(bluetoothDeviceRef.current);
      }
      bluetoothDeviceRef.current = device;

      try {
        const connectedDevice = await connectToDevice(device);
        setPrinterDevice(connectedDevice);
        storeDevice(connectedDevice);
        setStatus('connected');
        toast.success(`Connected to ${connectedDevice.name}`);

        device.addEventListener('gattserverdisconnected', onGattDisconnected);
      } catch (connectErr) {
        // Clean up the GATT connection on failure
        disconnectDevice(device);
        bluetoothDeviceRef.current = null;
        throw connectErr;
      }
    } catch (err) {
      // User cancelled the picker
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setStatus('disconnected');
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setStatus('error');
      toast.error(message);
    }
  }, [isSupported, onGattDisconnected]);

  const disconnect = useCallback(async () => {
    if (bluetoothDeviceRef.current) {
      const { disconnectDevice } = await import('@/lib/bluetooth/connection');
      bluetoothDeviceRef.current.removeEventListener('gattserverdisconnected', onGattDisconnected);
      disconnectDevice(bluetoothDeviceRef.current);
      bluetoothDeviceRef.current = null;
    }
    setPrinterDevice(null);
    storeDevice(null);
    setStatus('disconnected');
    setError(null);
  }, [onGattDisconnected]);

  const printReceiptFn = useCallback(
    async (data: ReceiptData) => {
      if (!bluetoothDeviceRef.current || !printerDevice) {
        throw new Error('Printer not connected');
      }

      setStatus('printing');
      try {
        const { buildReceiptCommands } = await import('@/lib/bluetooth/escpos');
        const { writeData } = await import('@/lib/bluetooth/connection');
        const commands = buildReceiptCommands(data);
        await writeData(bluetoothDeviceRef.current, printerDevice, commands);
        setStatus('connected');
      } catch (err) {
        // Check if device disconnected during print
        if (!bluetoothDeviceRef.current?.gatt?.connected) {
          setStatus('disconnected');
          setPrinterDevice(null);
          bluetoothDeviceRef.current = null;
        } else {
          setStatus('connected');
        }
        throw err;
      }
    },
    [printerDevice],
  );

  return (
    <PrinterContext.Provider
      value={{
        status,
        deviceName: printerDevice?.name ?? null,
        error,
        isSupported,
        connect,
        disconnect,
        printReceipt: printReceiptFn,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}
