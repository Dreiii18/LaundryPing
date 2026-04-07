import { KNOWN_PROFILES, ALL_SERVICE_UUIDS } from './printer-profiles';
import type { PrinterDevice } from '@/types/printer';

const CHUNK_SIZE = 100;
const CHUNK_DELAY_MS = 20;

/**
 * Opens the browser Bluetooth device picker. Must be called from a user gesture.
 */
export async function requestPrinterDevice(): Promise<BluetoothDevice> {
  return navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ALL_SERVICE_UUIDS,
  });
}

/**
 * Connects to a BluetoothDevice and finds a working GATT service/characteristic pair.
 * Iterates known printer profiles until one succeeds.
 */
export async function connectToDevice(device: BluetoothDevice): Promise<PrinterDevice> {
  if (!device.gatt) {
    throw new Error('Device does not support GATT');
  }
  const server = await device.gatt.connect();

  for (const profile of KNOWN_PROFILES) {
    try {
      const service = await server.getPrimaryService(profile.serviceUUID);
      const characteristic = await service.getCharacteristic(profile.characteristicUUID);
      // Verify the characteristic supports write
      if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
        return {
          id: device.id,
          name: device.name || 'Thermal Printer',
          serviceUUID: profile.serviceUUID,
          characteristicUUID: profile.characteristicUUID,
        };
      }
    } catch {
      // Profile didn't match — try next one
      continue;
    }
  }

  // If no known profile matched, try to discover any writable characteristic
  for (const profile of KNOWN_PROFILES) {
    try {
      const service = await server.getPrimaryService(profile.serviceUUID);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          return {
            id: device.id,
            name: device.name || 'Thermal Printer',
            serviceUUID: profile.serviceUUID,
            characteristicUUID: char.uuid,
          };
        }
      }
    } catch {
      continue;
    }
  }

  server.disconnect();
  throw new Error('No compatible printer service found. Make sure the device is a thermal printer.');
}

/**
 * Writes data to the printer in chunks to avoid BLE buffer overflow.
 */
export async function writeData(
  device: BluetoothDevice,
  printerDevice: PrinterDevice,
  data: Uint8Array,
): Promise<void> {
  if (!device.gatt) {
    throw new Error('Device does not support GATT');
  }
  if (!device.gatt.connected) {
    await device.gatt.connect();
  }

  const server = device.gatt;
  const service = await server.getPrimaryService(printerDevice.serviceUUID);
  const characteristic = await service.getCharacteristic(printerDevice.characteristicUUID);

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValueWithResponse(chunk);
    }
    if (offset + CHUNK_SIZE < data.length) {
      await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
    }
  }
}

/**
 * Disconnects from the printer.
 */
export function disconnectDevice(device: BluetoothDevice): void {
  if (device.gatt?.connected) {
    device.gatt.disconnect();
  }
}
