'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  BarChart3,
  FileText,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/blog', label: 'Blog', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

interface AdminSidebarContentProps {
  onNavigate?: () => void;
}

export function AdminSidebarContent({ onNavigate }: AdminSidebarContentProps) {
  const pathname = usePathname();
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
    <div className="flex flex-col justify-between h-full py-6">
      <div>
        {/* Logo */}
        <Link href="/admin/plans" className="px-6 mb-6 flex items-center gap-3">
          <Image src="/laundryping-icon.png" alt="LaundryPing" width={120} height={120} className="size-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold leading-none">LaundryPing</h1>
            <p className="text-xs text-[#0d968b] font-medium">Super Admin</p>
          </div>
        </Link>

        {/* Back to Dashboard */}
        <div className="px-3 mb-4">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors min-h-11 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 font-medium"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-11 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                  isActive
                    ? 'bg-[#0d968b]/10 text-[#0d968b] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="size-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="px-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-11 outline-none focus-visible:ring-[3px] focus-visible:ring-red-500/30"
        >
          <LogOut className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-64 border-r border-[#0d968b]/10 bg-white flex-col shrink-0">
      <AdminSidebarContent />
    </aside>
  );
}
