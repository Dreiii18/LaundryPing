'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { usePrinter } from '@/components/printer-provider';
import type { ReceiptData } from '@/lib/utils/receipt';
import type { Job } from '@/components/jobs-table/types';
import type { ShopInfo } from '@/types/shop';

function buildReceiptData(job: Job, shopInfo: ShopInfo): ReceiptData {
  return {
    shopName: shopInfo.name,
    shopAddress: shopInfo.address,
    shopContact: shopInfo.contactNumber,
    claimNumber: job.claim_number,
    date: job.started_at,
    customerName: job.customer_name,
    customerPhone: job.customer_phone_masked,
    services: job.services,
    servicePrices: shopInfo.servicePrices,
    payAmount: job.pay_amount ?? 0,
    cashTendered: job.cash_tendered,
    isPaid: job.is_paid,
    paymentMethod: job.payment_method,
    paperSize: shopInfo.receiptPaperSize,
  };
}

export function useHandlePrint(shopInfo?: ShopInfo) {
  const { printReceipt: bluetoothPrint, status, isSupported } = usePrinter();

  return useCallback(
    async (job: Job) => {
      if (!shopInfo) return;
      const data = buildReceiptData(job, shopInfo);

      if (isSupported && status === 'connected') {
        try {
          await bluetoothPrint(data);
          toast.success('Receipt printed');
        } catch {
          // Fallback to browser print dialog
          toast.warning('Bluetooth print failed — using browser print');
          const { printReceipt } = await import('@/lib/utils/receipt');
          printReceipt(data);
        }
      } else {
        const { printReceipt } = await import('@/lib/utils/receipt');
        printReceipt(data);
      }
    },
    [shopInfo, status, isSupported, bluetoothPrint],
  );
}
