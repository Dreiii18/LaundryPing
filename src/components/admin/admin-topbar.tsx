'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Shield } from 'lucide-react';
import { AdminMobileSidebar } from './admin-mobile-sidebar';

interface AdminTopbarProps {
  userInitials: string;
}

export function AdminTopbar({ userInitials }: AdminTopbarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-[#0d968b]/10 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-11 min-w-11"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>

          <Shield className="size-5 text-[#0d968b]" />
          <h2 className="text-lg font-semibold text-slate-800">Admin Panel</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="size-10 bg-[#0d968b]/20 text-[#0d968b] rounded-full flex items-center justify-center font-bold text-sm">
            {userInitials}
          </div>
        </div>
      </header>

      <AdminMobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </>
  );
}
