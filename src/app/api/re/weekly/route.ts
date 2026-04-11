import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAuthUser, isOwner } from '@/lib/realestate/auth';

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '52');
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('re_weekly_data')
    .select('*', { count: 'exact' })
    .order('week_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const supabase = getServiceSupabase();

  // Upsert by week_label — if a row for this week exists, merge the new values
  // over it instead of throwing a unique constraint error
  const { data, error } = await supabase
    .from('re_weekly_data')
    .upsert(
      { ...body, created_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'week_label' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the update
  await supabase.from('re_update_log').insert({
    update_type: 'manual_weekly',
    description: `Saved weekly data for ${body.week_label}`,
    data_snapshot: body,
    updated_by: user.id,
  });

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const weekLabel = searchParams.get('week_label');
  const emptyOnly = searchParams.get('empty_only') === 'true';

  const supabase = getServiceSupabase();

  // Cleanup mode: delete all rows where every metric field is null
  if (emptyOnly) {
    const { data, error } = await supabase
      .from('re_weekly_data')
      .delete()
      .is('total_transactions', null)
      .is('offplan_transactions', null)
      .is('secondary_transactions', null)
      .is('mortgage_registrations', null)
      .is('cash_transactions', null)
      .is('total_value_aed_billions', null)
      .is('dfm_re_index', null)
      .is('emaar_share_price', null)
      .is('listing_inventory', null)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: data?.length ?? 0, rows: data });
  }

  if (!id && !weekLabel) {
    return NextResponse.json({ error: 'id or week_label required' }, { status: 400 });
  }

  const query = supabase.from('re_weekly_data').delete();
  const { error } = id ? await query.eq('id', id) : await query.eq('week_label', weekLabel);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id, ...updates } = body;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('re_weekly_data')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('re_update_log').insert({
    update_type: 'manual_weekly',
    description: `Updated weekly data for ${updates.week_label ?? id}`,
    data_snapshot: updates,
    updated_by: user.id,
  });

  return NextResponse.json({ data });
}
