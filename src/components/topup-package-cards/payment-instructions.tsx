'use client';

import Image from 'next/image';
import { CheckCircle } from 'lucide-react';

interface PaymentInstructionsProps {
  onQrClick: () => void;
}

export function PaymentInstructions({ onQrClick }: PaymentInstructionsProps) {
  return (
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
                onClick={onQrClick}
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
  );
}
