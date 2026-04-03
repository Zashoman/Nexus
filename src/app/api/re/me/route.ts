import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, getAuthUser } from '@/lib/realestate/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ role: null });

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('re_users')
    .select('role')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ role: data?.role ?? null, email: user.email });
}
