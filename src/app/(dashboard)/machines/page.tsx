import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MachinesTable } from '@/components/machines-table';

export default async function MachinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: laundromat } = await supabase
    .from('laundromats')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!laundromat) {
    redirect('/login');
  }

  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .eq('laundromat_id', laundromat.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  const safeMachines = (machines || []).map((m) => ({
    id: m.id,
    label: m.label,
    type: m.type as 'washer' | 'dryer',
    status: m.status,
    created_at: m.created_at,
  }));

  return (
    <div>
      <MachinesTable machines={safeMachines} />
    </div>
  );
}
