export interface SettingsFormProps {
  initialName: string;
  initialAddress: string;
  initialServices: string[];
  initialServicePrices: Record<string, number>;
  initialRushFee: number;
  initialContactNumber: string;
}

export interface ServicesManagerProps {
  services: string[];
  servicePrices: Record<string, number>;
  newService: string;
  newServicePrice: string;
  onNewServiceChange: (value: string) => void;
  onNewServicePriceChange: (value: string) => void;
  onAddService: () => void;
  onRemoveService: (index: number) => void;
  onUpdateServicePrice: (service: string, price: string) => void;
}
