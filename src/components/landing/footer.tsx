import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="px-6 py-7 border-t border-black/[0.06]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Image
              src="/laundryping-icon.png"
              alt="LaundryPing"
              width={20}
              height={20}
              className="size-5 rounded"
            />
            <span className="text-[#111817] font-semibold text-sm">
              LaundryPing
            </span>
          </div>
          <div className="w-px h-4 bg-black/[0.06]" />
          <span className="text-xs text-[#94a3b8]">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-5 text-[0.8125rem]">
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
          <a
            href="https://www.facebook.com/share/18CNvPMTfH/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-[#618986] hover:text-[#111817] transition-colors inline-flex"
          >
            <Facebook className="size-[1.125rem]" />
          </a>
          <a
            href="https://www.instagram.com/laundry.ping"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-[#618986] hover:text-[#111817] transition-colors inline-flex"
          >
            <Instagram className="size-[1.125rem]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
