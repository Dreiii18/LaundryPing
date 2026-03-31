'use client';

import { useState } from 'react';
import { PackageCard } from './package-card';
import { PaymentInstructions } from './payment-instructions';
import { QrCodeModal } from './qr-code-modal';

interface Package {
  slug: string;
  label: string;
  sms_credits: number;
  price_php: number;
  description: string | null;
}

interface TopupPackageCardsProps {
  packages: Package[];
}

export function TopupPackageCards({ packages }: TopupPackageCardsProps) {
  const [qrOpen, setQrOpen] = useState(false);

  if (packages.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No top-up packages available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <PackageCard key={pkg.slug} pkg={pkg} />
        ))}
      </div>

      {/* GCash Payment Instructions */}
      <PaymentInstructions onQrClick={() => setQrOpen(true)} />

      {/* QR Code Fullscreen Modal */}
      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        imageSrc="/gcash-qr.jpeg"
      />
    </div>
  );
}
