import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
