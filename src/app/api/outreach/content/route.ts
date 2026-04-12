import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: fetch content libraries (case studies + articles)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'case_studies' or 'content_library' or both

    const supabase = getServiceSupabase();
    const results: Record<string, unknown> = {};

    if (!type || type === 'case_studies') {
      const { data } = await supabase
        .from('case_studies')
        .select('*')
        .eq('active', true)
        .order('client_name');
      results.case_studies = data || [];
    }

    if (!type || type === 'content_library') {
      const { data } = await supabase
        .from('content_library')
        .select('*')
        .eq('active', true)
        .order('title');
      results.articles = data || [];
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// POST: add a new case study or article
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();

    if (body.table === 'case_studies') {
      const { data, error } = await supabase.from('case_studies').insert({
        client_name: body.client_name,
        industry_tags: body.industry_tags || [],
        result_headline: body.result_headline,
        result_detail: body.result_detail,
        metrics: body.metrics || {},
        campaign_types: body.campaign_types || ['sales', 'sponsored_link'],
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data }, { status: 201 });
    }

    if (body.table === 'content_library') {
      const { data, error } = await supabase.from('content_library').insert({
        title: body.title,
        topic_tags: body.topic_tags || [],
        url: body.url,
        summary: body.summary,
        full_text: body.full_text,
        campaign_types: body.campaign_types || ['editorial'],
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data }, { status: 201 });
    }

    return NextResponse.json({ error: 'table must be case_studies or content_library' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
