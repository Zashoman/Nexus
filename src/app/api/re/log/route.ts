import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/realestate/auth';

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50');
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('re_update_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}
