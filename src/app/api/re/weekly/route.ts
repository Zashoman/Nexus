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

  const { data, error } = await supabase
    .from('re_weekly_data')
    .insert({ ...body, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the update
  await supabase.from('re_update_log').insert({
    update_type: 'manual_weekly',
    description: `Added weekly data for ${body.week_label}`,
    data_snapshot: body,
    updated_by: user.id,
  });

  return NextResponse.json({ data });
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
