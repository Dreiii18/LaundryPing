'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  ListTodo,
  WashingMachine,
  Settings,
  MessageSquare,
  Wallet,
  Shield,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: ListTodo },
  { href: '/machines', label: 'Machines', icon: WashingMachine },
  { href: '/plan-billing', label: 'SMS Credits', icon: Wallet },
  { href: '/sms-history', label: 'SMS History', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarContentProps {
  onNavigate?: () => void;
  isAdmin?: boolean;
}

export function SidebarContent({ onNavigate, isAdmin: isAdminUser }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex flex-col justify-between h-full py-6">
      <div>
        {/* Logo */}
        <Link href="/dashboard" className="px-6 mb-8 flex items-center gap-3">
          <Image src="/laundryping-icon.png" alt="LaundryPing" width={120} height={120} className="size-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold leading-none">LaundryPing</h1>
            <p className="text-xs text-[#0d968b] font-medium">{isAdminUser ? 'Admin Console' : 'Staff Dashboard'}</p>
          </div>
        </Link>

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

        {/* Admin Link */}
        {isAdminUser && (
          <>
            <div className="mx-3 my-3 h-px bg-[#0d968b]/15" />
            <div className="px-3">
              <Link
                href="/admin/plans"
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-11 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0d968b]/30 ${
                  pathname.startsWith('/admin')
                    ? 'bg-[#0d968b]/10 text-[#0d968b] font-semibold'
                    : 'text-[#0d968b] hover:bg-[#0d968b]/5 font-medium'
                }`}
              >
                <Shield className="size-5" aria-hidden="true" />
                <span>Admin Panel</span>
              </Link>
            </div>
          </>
        )}
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

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin: isAdminUser }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 border-r border-[#0d968b]/10 bg-white flex-col shrink-0">
      <SidebarContent isAdmin={isAdminUser} />
    </aside>
  );
}
