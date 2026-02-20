import { createClient } from './server';

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, laundromat: null, supabase, error: 'Unauthorized' as const };
  }

  const { data: laundromat, error: laundromatError } = await supabase
    .from('laundromats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (laundromatError || !laundromat) {
    return { user, laundromat: null, supabase, error: 'Laundromat not found' as const };
  }

  return { user, laundromat, supabase, error: null };
}
