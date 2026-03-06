import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export async function GET() {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const { data: packages, error: queryError } = await supabase
      .from('sms_topup_packages')
      .select('slug, label, sms_credits, price_php, description')
      .order('sort_order', { ascending: true });

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    return NextResponse.json({ packages: packages || [] });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
