import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const params = req.nextUrl.searchParams;
  const tier = params.get('tier');
  const search = params.get('search');

  let query = supabase.from('robox_companies').select('*');

  if (tier) query = query.eq('tier', tier);
  if (search) query = query.ilike('name', `%${search}%`);

  query = query.order('name');

  const { data: companies, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get signal counts per company
  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      const { count } = await supabase
        .from('robox_signals')
        .select('id', { count: 'exact', head: true })
        .ilike('company', company.name);
      return { ...company, signal_count: count || 0 };
    })
  );

  return NextResponse.json({ companies: companiesWithCounts });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const body = await req.json();

  const { name, tier, status, raised, valuation, notes } = body;
  if (!name || !tier) {
    return NextResponse.json(
      { error: 'Missing required fields: name, tier' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('robox_companies')
    .insert({ name, tier, status, raised, valuation, notes })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
