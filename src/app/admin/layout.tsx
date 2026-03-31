import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, error } = await getCachedUser();

  if (error === 'Unauthorized' || !user) {
    redirect('/login');
  }

  if (!isAdmin(user)) {
    redirect('/dashboard');
  }

  const userInitials = (user.email || '')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar userInitials={userInitials} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background-light">
          {children}
        </main>
      </div>
    </div>
  );
}
