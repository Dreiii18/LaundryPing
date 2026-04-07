export interface PrinterProfile {
  name: string;
  serviceUUID: string;
  characteristicUUID: string;
}

/**
 * Known Bluetooth thermal printer GATT service/characteristic pairs.
 * The connection logic iterates these until one works.
 */
export const KNOWN_PROFILES: PrinterProfile[] = [
  {
    name: 'Generic Thermal (BLE)',
    serviceUUID: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    characteristicUUID: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  },
  {
    name: 'ISSC/Microchip',
    serviceUUID: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    characteristicUUID: '49535343-8841-43f4-a8d4-ecbe34729bb3',
  },
  {
    name: 'Generic Serial Port',
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
  },
];

export const ALL_SERVICE_UUIDS = KNOWN_PROFILES.map((p) => p.serviceUUID);
