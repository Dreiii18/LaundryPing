import Link from 'next/link';
import { WashingMachine } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-[#f6f8fa]/80 backdrop-blur-lg border-b border-black/5">
      <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-8 flex items-center justify-center rounded-lg bg-[#0d968b]/10">
            <WashingMachine className="size-5 text-[#0d968b]" />
          </div>
          <span className="text-[#111817] text-xl font-bold leading-tight tracking-tight">
            LaundryPing
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[#618986] hover:text-[#111817] transition-colors px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-bold text-[#0d968b] border border-[#0d968b] hover:bg-[#0d968b] hover:text-white transition-colors px-4 py-2.5 rounded-lg"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
