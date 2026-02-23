'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  ListTodo,
  WashingMachine,
  Settings,
  CreditCard,
  LogOut,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: ListTodo },
  { href: '/machines', label: 'Machines', icon: WashingMachine },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 border-r border-[#0d968b]/10 bg-white flex flex-col justify-between py-6 shrink-0">
      <div>
        {/* Logo */}
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="size-10 bg-[#0d968b] rounded-lg flex items-center justify-center text-white">
            <WashingMachine className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">LaundryPing</h1>
            <p className="text-xs text-[#0d968b] font-medium">Admin Console</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-11 ${
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

          {/* Plan & Billing - Disabled */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 cursor-not-allowed min-h-11" aria-disabled="true">
            <div className="flex items-center gap-3">
              <CreditCard className="size-5" aria-hidden="true" />
              <span className="text-sm font-medium">Plan & Billing</span>
            </div>
            <Lock className="size-3.5" aria-hidden="true" />
          </div>
        </nav>
      </div>

      {/* Logout */}
      <div className="px-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-11"
        >
          <LogOut className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
