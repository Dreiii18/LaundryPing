import Link from 'next/link';
import { WashingMachine } from 'lucide-react';

export function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-gray-100">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="size-7 flex items-center justify-center rounded-lg bg-[#0d968b]/10">
            <WashingMachine className="size-4 text-[#0d968b]" />
          </div>
          <span className="text-[#111817] font-bold text-base">
            LaundryPing
          </span>
          <span className="text-[#618986] text-sm ml-1 hidden sm:inline">
            &mdash; SMS alerts para sa laundromat mo
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/login"
            className="text-[#618986] hover:text-[#111817] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-[#618986] hover:text-[#111817] transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-gray-100">
        <p className="text-xs text-[#618986] text-center sm:text-left">
          &copy; 2026 LaundryPing. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
