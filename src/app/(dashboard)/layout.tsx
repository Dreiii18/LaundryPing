import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function DashboardLayout({
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

  // Fetch laundromat data
  const { data: laundromat } = await supabase
    .from('laundromats')
    .select('id, name, address')
    .eq('user_id', user.id)
    .single();

  const shopName = laundromat?.name || 'My Laundromat';
  const userEmail = user.email || '';
  const userInitials = userEmail
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar shopName={shopName} userInitials={userInitials} />
        <main className="flex-1 overflow-y-auto p-8 bg-background-light">
          {children}
        </main>
      </div>
    </div>
  );
}
