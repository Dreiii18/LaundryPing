export interface SettingsFormProps {
  initialName: string;
  initialAddress: string;
  initialServices: string[];
  initialServicePrices: Record<string, number>;
  initialServiceWeights: Record<string, number>;
  initialRushFee: number;
  initialContactNumber: string;
  initialReceiptPaperSize: '58mm' | '80mm';
}

export interface ServicesManagerProps {
  services: string[];
  servicePrices: Record<string, number>;
  serviceWeights: Record<string, number>;
  newService: string;
  newServicePrice: string;
  newServiceWeight: string;
  onNewServiceChange: (value: string) => void;
  onNewServicePriceChange: (value: string) => void;
  onNewServiceWeightChange: (value: string) => void;
  onAddService: () => void;
  onRemoveService: (index: number) => void;
  onUpdateServicePrice: (service: string, price: string) => void;
  onUpdateServiceWeight: (service: string, weight: string) => void;
}
