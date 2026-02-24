import Link from 'next/link';
import {
  LayoutDashboard,
  ListTodo,
  MapPin,
  Settings,
  Droplets,
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-between px-4 py-16">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md">
        {/* Icon */}
        <div className="size-24 rounded-full bg-[#0d968b]/10 flex items-center justify-center mb-8">
          <Droplets className="size-12 text-[#0d968b]" />
        </div>

        {/* 404 */}
        <h1 className="text-8xl font-black text-slate-900 tracking-tight mb-4">
          404
        </h1>

        <h2 className="text-xl font-bold text-slate-800 mb-3">
          Oops! This page washed away.
        </h2>

        <p className="text-slate-500 leading-relaxed mb-8">
          The page you are looking for might have been moved, deleted,
          or spun right out of existence.
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0d968b] text-white font-bold text-sm hover:bg-[#0d968b]/90 transition-colors shadow-sm"
          >
            <LayoutDashboard className="size-4" />
            Back to Dashboard
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Contact Support
          </Link>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-10 mt-12">
          <Link href="/jobs" className="flex flex-col items-center gap-2 text-slate-500 hover:text-[#0d968b] transition-colors group">
            <ListTodo className="size-5 text-[#0d968b]/70 group-hover:text-[#0d968b]" />
            <span className="text-xs font-medium">View Jobs</span>
          </Link>
          <Link href="/machines" className="flex flex-col items-center gap-2 text-slate-500 hover:text-[#0d968b] transition-colors group">
            <MapPin className="size-5 text-[#0d968b]/70 group-hover:text-[#0d968b]" />
            <span className="text-xs font-medium">Machines</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-2 text-slate-500 hover:text-[#0d968b] transition-colors group">
            <Settings className="size-5 text-[#0d968b]/70 group-hover:text-[#0d968b]" />
            <span className="text-xs font-medium">Settings</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-16">
        &copy; 2026 LaundryPing. All rights reserved.
      </p>
    </div>
  );
}
