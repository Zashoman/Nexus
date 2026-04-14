import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateDedupHash } from '@/lib/robox-intel/dedup';

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase();
  const params = req.nextUrl.searchParams;

  const type = params.get('type');
  const relevance = params.get('relevance');
  const status = params.get('status');
  const company = params.get('company');
  const search = params.get('search');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 200);
  const offset = parseInt(params.get('offset') || '0');

  let query = supabase
    .from('robox_signals')
    .select('*', { count: 'exact' });

  if (type) {
    const types = type.split(',');
    query = query.in('type', types);
  }
  if (relevance) {
    query = query.eq('relevance', relevance);
  }
  if (status) {
    const statuses = status.split(',');
    query = query.in('status', statuses);
  }
  if (company) {
    query = query.ilike('company', `%${company}%`);
  }
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,summary.ilike.%${search}%,company.ilike.%${search}%`
    );
  }
  if (dateFrom) {
    query = query.gte('date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('date', dateTo);
  }

  query = query
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signals: data || [], total: count || 0 });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const body = await req.json();

  const {
    type, title, company, source, url, date,
    summary, suggestedAction, relevance, tags,
  } = body;

  if (!type || !title || !company || !url) {
    return NextResponse.json(
      { error: 'Missing required fields: type, title, company, url' },
      { status: 400 }
    );
  }

  const dedupHash = await generateDedupHash(url, title);

  const { data, error } = await supabase
    .from('robox_signals')
    .insert({
      type,
      title,
      company,
      source: source || 'Manual Entry',
      source_key: 'manual',
      url,
      date: date || new Date().toISOString().split('T')[0],
      summary: summary || title,
      suggested_action: suggestedAction || 'Review this signal for outreach opportunities.',
      relevance: relevance || 'medium',
      status: 'new',
      tags: tags || [],
      dedup_hash: dedupHash,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Duplicate signal: this URL/title combination already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
