'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AdminSidebarContent } from '@/components/admin/admin-sidebar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface AdminMobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminMobileSidebar({ open, onOpenChange }: AdminMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <VisuallyHidden>
          <SheetTitle>Admin navigation menu</SheetTitle>
        </VisuallyHidden>
        <AdminSidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
