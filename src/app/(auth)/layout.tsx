import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background-light">
      <header className="px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/laundryping-icon.png" alt="LaundryPing" width={32} height={32} className="size-8 rounded-lg" />
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
