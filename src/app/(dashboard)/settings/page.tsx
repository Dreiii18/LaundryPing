import { getCachedUser } from '@/lib/supabase/cached-auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings-form';
import { Store } from 'lucide-react';

export default async function SettingsPage() {
  const { user, laundromat } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-slate-500 mt-2">
          Manage your laundromat profile.
        </p>
      </header>

      <div className="space-y-8">
        {/* Section: Laundromat Details */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Store className="size-5 text-[#0d968b]" />
              Laundromat details
            </h3>
          </div>
          <SettingsForm
            initialName={laundromat.name || ''}
            initialAddress={laundromat.address || ''}
            initialServices={laundromat.available_services || ['Wash', 'Dry']}
          />
        </section>
      </div>
    </div>
  );
}
