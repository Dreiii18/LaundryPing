import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';

export function OnboardingBanner() {
  return (
    <div className="bg-white border-2 border-[#0d968b]/30 rounded-xl p-6 flex items-start gap-4">
      <Image src="/laundryping-icon.png" alt="LaundryPing" width={144} height={144} className="size-12 rounded-xl shrink-0" />
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Welcome to LaundryPing!</h3>
        <p className="text-sm text-slate-600 mb-3">
          Get started by adding your first machine.
        </p>
        <Link
          href="/machines"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d968b] text-white font-semibold text-sm hover:bg-[#0d968b]/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Machine
        </Link>
      </div>
    </div>
  );
}
