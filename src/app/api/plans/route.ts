import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export async function GET() {
  try {
    const { supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: plans, error: queryError } = await supabase
      .from('sms_plans')
      .select('tier, label, sms_limit, price_php, description')
      .order('sort_order', { ascending: true });

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
