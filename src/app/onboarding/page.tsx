import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { OnboardingWizard } from '@/components/onboarding/wizard';

export default async function OnboardingPage() {
  // Auth + onboarding_completed_at redirect are enforced by the parent layout
  // (src/app/onboarding/layout.tsx). React.cache dedupes the getCachedUser
  // call within this render tree, so re-reading here is essentially free.
  // The null-checks here exist only to satisfy TypeScript narrowing.
  const { laundromat, supabase } = await getCachedUser();
  if (!laundromat) redirect('/login');

  const { count: machineCount } = await supabase
    .from('machines')
    .select('id', { count: 'exact', head: true })
    .eq('laundromat_id', laundromat.id)
    .in('status', ['active', 'maintenance']);

  return (
    <OnboardingWizard
      initialShopName={laundromat.name}
      initialContactNumber={laundromat.contact_number ?? ''}
      hasMachine={(machineCount ?? 0) > 0}
    />
  );
}
