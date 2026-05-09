import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { OnboardingTopbar } from '@/components/onboarding/topbar';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, laundromat } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  if (laundromat.onboarding_completed_at) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <OnboardingTopbar shopName={laundromat.name} />
      <main className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}
