import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-[#f6f8fa]/80 backdrop-blur-lg border-b border-black/5">
      <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Image
            src="/laundryping-icon.png"
            alt="LaundryPing"
            width={32}
            height={32}
            className="size-8 rounded-lg"
          />
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
