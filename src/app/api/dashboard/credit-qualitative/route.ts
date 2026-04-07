import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const db = getServiceSupabase();
  const { data } = await db
    .from('private_credit_qualitative')
    .select('*')
    .order('signal_key', { ascending: true });

  const checkedCount = (data || []).filter(s => s.is_checked).length;

  return NextResponse.json({
    signals: data || [],
    checked_count: checkedCount,
    warning_level: checkedCount >= 5 ? 'red' : checkedCount >= 3 ? 'amber' : 'none',
  });
}

export async function PUT(req: NextRequest) {
  const db = getServiceSupabase();
  const { signal_key, is_checked } = await req.json();

  if (!signal_key) {
    return NextResponse.json({ error: 'signal_key required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    is_checked,
    updated_at: new Date().toISOString(),
  };
  if (is_checked) {
    updates.checked_at = new Date().toISOString();
  } else {
    updates.unchecked_at = new Date().toISOString();
  }

  const { error } = await db
    .from('private_credit_qualitative')
    .update(updates)
    .eq('signal_key', signal_key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
