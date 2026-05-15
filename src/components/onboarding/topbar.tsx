'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function OnboardingTopbar({ shopName }: { shopName: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.push('/');
    });
  };

  return (
    <header className="bg-white border-b border-[#0d968b]/10 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image src="/laundryping-icon.png" alt="LaundryPing" width={80} height={80} className="size-8 rounded-lg" />
        <div>
          <h1 className="text-base font-bold leading-none">LaundryPing</h1>
          <p className="text-xs text-[#0d968b] font-medium">{shopName}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
