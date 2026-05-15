import type { ServicePhaseConfigEntry } from '@/types/database';

export type PhaseMachineType = 'washer' | 'dryer' | 'combo' | 'other' | 'none';

export interface SettingsFormProps {
  initialName: string;
  initialAddress: string;
  initialServices: string[];
  initialServicePrices: Record<string, number>;
  initialServiceWeights: Record<string, number>;
  initialServiceTypes: Record<string, string>;
  initialServicePhaseConfig: Record<string, ServicePhaseConfigEntry>;
  initialRushFee: number;
  initialContactNumber: string;
  initialReceiptPaperSize: '58mm' | '80mm';
}

export interface ServicesManagerProps {
  services: string[];
  servicePrices: Record<string, number>;
  serviceWeights: Record<string, number>;
  serviceTypes: Record<string, string>;
  servicePhaseConfig: Record<string, ServicePhaseConfigEntry>;
  newService: string;
  newServicePrice: string;
  newServiceWeight: string;
  newServiceType: string;
  onNewServiceChange: (value: string) => void;
  onNewServicePriceChange: (value: string) => void;
  onNewServiceWeightChange: (value: string) => void;
  onNewServiceTypeChange: (value: string) => void;
  onAddService: () => void;
  onRemoveService: (index: number) => void;
  onUpdateServicePrice: (service: string, price: string) => void;
  onUpdateServiceWeight: (service: string, weight: string) => void;
  onUpdateServiceType: (service: string, type: string) => void;
  onUpdatePhaseIsPhase: (service: string, isPhase: boolean) => void;
  onUpdatePhaseMachineType: (service: string, machineType: PhaseMachineType) => void;
  onUpdatePhaseMinutes: (service: string, minutes: string) => void;
}
