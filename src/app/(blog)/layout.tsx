import Link from 'next/link';
import { WashingMachine } from 'lucide-react';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2">
            <div className="size-8 bg-[#0d968b] rounded-lg flex items-center justify-center text-white">
              <WashingMachine className="size-4" />
            </div>
            <span className="font-bold text-slate-800">LaundryPing</span>
            <span className="text-sm text-slate-400 ml-1">Blog</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#0d968b] font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} LaundryPing. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
