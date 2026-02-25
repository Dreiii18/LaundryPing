'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Store, Menu } from 'lucide-react';
import { StartJobModal } from './start-job-modal';
import { MobileSidebar } from './mobile-sidebar';

interface TopbarProps {
  shopName: string;
  userInitials: string;
  isAdmin?: boolean;
}

export function Topbar({ shopName, userInitials, isAdmin: isAdminUser }: TopbarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-[#0d968b]/10 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-11 min-w-11"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>

          <Store className="size-5 text-[#0d968b] hidden sm:block" />
          <h2 className="text-lg font-semibold text-slate-800 truncate">{shopName}</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm shadow-sm min-h-11"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Start new job</span>
          </Button>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div className="size-10 bg-[#0d968b]/20 text-[#0d968b] rounded-full flex items-center justify-center font-bold text-sm hidden sm:flex">
            {userInitials}
          </div>
        </div>
      </header>

      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} isAdmin={isAdminUser} />
      <StartJobModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
