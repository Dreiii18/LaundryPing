import Link from 'next/link';
import { WashingMachine } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background-light">
      <header className="px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="size-8 flex items-center justify-center rounded-lg bg-[#0d968b]/10">
            <WashingMachine className="size-5 text-[#0d968b]" />
          </div>
          <span className="text-[#111817] text-xl font-bold leading-tight tracking-tight">
            LaundryPing
          </span>
        </Link>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        {children}
      </div>
    </div>
  );
}
