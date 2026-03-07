'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle, X } from 'lucide-react';

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
        {packages.map((pkg) => {
          const isMostPopular = pkg.slug === 'pack-600';
          const isBestValue = pkg.slug === 'pack-1100';
          const isHighlighted = isMostPopular || isBestValue;

          return (
            <div
              key={pkg.slug}
              className={`relative rounded-xl border p-6 transition-shadow ${
                isHighlighted
                  ? 'border-[#0d968b]/40 shadow-md hover:shadow-lg'
                  : 'border-slate-200 hover:shadow-md'
              }`}
            >
              {isMostPopular && (
                <Badge className="absolute -top-2.5 left-4 bg-[#0d968b] text-white text-[10px] font-bold uppercase">
                  Most Popular
                </Badge>
              )}
              {isBestValue && (
                <Badge className="absolute -top-2.5 left-4 bg-amber-500 text-white text-[10px] font-bold uppercase">
                  Best Value
                </Badge>
              )}

              <div className="mb-4">
                <h4 className="text-lg font-bold text-slate-900">{pkg.label}</h4>
                {pkg.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                )}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900">₱{pkg.price_php}</span>
                <span className="text-sm text-slate-500"> one-time</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MessageSquare className="size-4 text-[#0d968b]" aria-hidden="true" />
                <span className="font-semibold">{pkg.sms_credits.toLocaleString()}</span>
                <span className="text-slate-500">SMS credits</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Credits never expire</p>
            </div>
          );
        })}
      </div>

      {/* GCash Payment Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h4 className="text-base font-bold text-slate-900 mb-4">Paano bumili ng SMS credits</h4>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#0d968b]">1</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Pumili ng SMS pack</p>
              <p className="text-xs text-slate-500">Piliin ang pack na bagay sa iyong laundromat.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#0d968b]">2</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Bayaran via GCash</p>
              <p className="text-xs text-slate-500">I-scan ang QR code</p>

              {/* GCash QR Code */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="w-40 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d968b]/50"
                >
                  <Image
                    src="/gcash-qr.jpeg"
                    alt="GCash QR Code para sa LaundryPing payment — click to enlarge"
                    width={160}
                    height={280}
                    className="w-full h-auto"
                  />
                </button>
                <p className="text-[10px] text-slate-400 mt-1">Tap to view full size</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#0d968b]">3</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">I-send ang receipt</p>
              <p className="text-xs text-slate-500">
                I-send ang screenshot ng GCash receipt kasama ang email address na ginamit sa LaundryPing sa{' '}
                <a href="mailto:official.laundryping@gmail.com" className="text-[#0d968b] font-semibold hover:underline">
                  official.laundryping@gmail.com
                </a>
                . Makakatanggap ka ng confirmation email kapag na-verify na ang bayad mo.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <CheckCircle className="size-4 text-[#0d968b]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Ma-add ang credits mo</p>
              <p className="text-xs text-slate-500">
                Ia-add ang SMS credits mo within 24 hours pagkatapos ma-verify ang bayad.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Gusto mo bang magbayad sa ibang paraan? I-contact kami sa{' '}
                <a href="mailto:official.laundryping@gmail.com" className="text-[#0d968b] font-semibold hover:underline">
                  official.laundryping@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* QR Code Fullscreen Modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="absolute -top-3 -right-3 z-10 size-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-slate-100 transition-colors"
              aria-label="Close QR code"
            >
              <X className="size-4 text-slate-600" />
            </button>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <Image
                src="/gcash-qr.jpeg"
                alt="GCash QR Code para sa LaundryPing payment"
                width={400}
                height={700}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
