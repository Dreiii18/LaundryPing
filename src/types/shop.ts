export interface ShopInfo {
  name: string;
  address: string | null;
  contactNumber: string | null;
  servicePrices: Record<string, number>;
  serviceWeights: Record<string, number>;
  serviceTypes: Record<string, string>;
  receiptPaperSize: '58mm' | '80mm';
}
