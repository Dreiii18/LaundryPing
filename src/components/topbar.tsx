'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Store } from 'lucide-react';
import { StartJobModal } from './start-job-modal';

interface TopbarProps {
  shopName: string;
  userInitials: string;
}

export function Topbar({ shopName, userInitials }: TopbarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-[#0d968b]/10 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <Store className="size-5 text-[#0d968b]" />
          <h2 className="text-lg font-semibold text-slate-800">{shopName}</h2>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm shadow-sm min-h-11"
          >
            <Plus className="size-4" aria-hidden="true" />
            Start new job
          </Button>
          <div className="h-8 w-px bg-slate-200" />
          <div className="size-10 bg-[#0d968b]/20 text-[#0d968b] rounded-full flex items-center justify-center font-bold text-sm">
            {userInitials}
          </div>
        </div>
      </header>

      <StartJobModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
