export interface SettingsFormProps {
  initialName: string;
  initialAddress: string;
  initialServices: string[];
  initialServicePrices: Record<string, number>;
  initialServiceWeights: Record<string, number>;
  initialServiceTypes: Record<string, string>;
  initialRushFee: number;
  initialContactNumber: string;
  initialReceiptPaperSize: '58mm' | '80mm';
}

export interface ServicesManagerProps {
  services: string[];
  servicePrices: Record<string, number>;
  serviceWeights: Record<string, number>;
  serviceTypes: Record<string, string>;
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
}
