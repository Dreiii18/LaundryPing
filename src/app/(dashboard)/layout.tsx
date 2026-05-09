import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { PrinterProvider } from '@/components/printer-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, laundromat } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  if (!laundromat.onboarding_completed_at) {
    redirect('/onboarding');
  }

  const shopName = laundromat.name || 'My Laundromat';
  const userEmail = user.email || '';
  const userInitials = userEmail
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();
  const adminUser = isAdmin(user);

  return (
    <PrinterProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isAdmin={adminUser} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar shopName={shopName} userInitials={userInitials} isAdmin={adminUser} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background-light">
            {children}
          </main>
        </div>
      </div>
    </PrinterProvider>
  );
}
