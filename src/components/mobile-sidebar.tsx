'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/sidebar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <VisuallyHidden>
          <SheetTitle>Navigation menu</SheetTitle>
        </VisuallyHidden>
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
