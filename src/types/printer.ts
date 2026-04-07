export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';

export interface PrinterDevice {
  id: string;
  name: string;
  serviceUUID: string;
  characteristicUUID: string;
}
