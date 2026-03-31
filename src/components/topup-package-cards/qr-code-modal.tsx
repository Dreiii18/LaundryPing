'use client';

import Image from 'next/image';
import { X } from 'lucide-react';

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
}

export function QrCodeModal({ open, onClose, imageSrc }: QrCodeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 size-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-slate-100 transition-colors"
          aria-label="Close QR code"
        >
          <X className="size-4 text-slate-600" />
        </button>
        <div className="rounded-xl overflow-hidden shadow-2xl">
          <Image
            src={imageSrc}
            alt="GCash QR Code para sa LaundryPing payment"
            width={400}
            height={700}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>
    </div>
  );
}
