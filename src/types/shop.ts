export interface ShopInfo {
  name: string;
  address: string | null;
  contactNumber: string | null;
  servicePrices: Record<string, number>;
  receiptPaperSize: '58mm' | '80mm';
}
