import { NextRequest, NextResponse } from 'next/server';
import { getFilterProfile } from '@/lib/intel/filter-learner';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const data = await getFilterProfile();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get filter profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const body = await req.json();

  const { id, weight } = body as { id: string; weight: number };

  if (!id || weight == null) {
    return NextResponse.json(
      { error: 'id and weight are required' },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from('intel_filter_profile')
    .update({ weight, last_updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
