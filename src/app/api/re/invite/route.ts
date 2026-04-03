import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAuthUser, isOwner } from '@/lib/realestate/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const supabase = getServiceSupabase();

  // Create auth user via invite
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Add to re_users as viewer
  const { error: userError } = await supabase
    .from('re_users')
    .upsert({
      id: authData.user.id,
      email,
      role: 'viewer',
      invited_at: new Date().toISOString(),
    }, { onConflict: 'email' });

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  await supabase.from('re_update_log').insert({
    update_type: 'baseline_change',
    description: `Invited viewer: ${email}`,
    updated_by: user.id,
  });

  return NextResponse.json({ success: true, email });
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isOwner(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('re_users')
    .select('*')
    .eq('role', 'viewer')
    .order('invited_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
