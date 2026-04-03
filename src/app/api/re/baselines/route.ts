import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAuthUser, isOwner } from '@/lib/realestate/auth';

export async function GET() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('re_baselines')
    .select('*')
    .order('metric_key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { baselines } = await request.json();
  const supabase = getServiceSupabase();

  const updates = [];
  for (const b of baselines) {
    const { error } = await supabase
      .from('re_baselines')
      .update({ baseline_value: b.baseline_value, updated_at: new Date().toISOString() })
      .eq('metric_key', b.metric_key);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updates.push({ metric_key: b.metric_key, baseline_value: b.baseline_value });
  }

  await supabase.from('re_update_log').insert({
    update_type: 'baseline_change',
    description: `Updated ${updates.length} baseline values`,
    data_snapshot: { baselines: updates },
    updated_by: user.id,
  });

  return NextResponse.json({ success: true });
}
