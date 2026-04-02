import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const { error } = await supabaseAdmin
      .from('laundromats')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        { status: 'error', error: 'Database unavailable', timestamp },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'ok', timestamp });
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Database unavailable', timestamp },
      { status: 503 }
    );
  }
}
