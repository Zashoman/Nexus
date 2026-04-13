import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: list training documents
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('training_documents')
      .select('*')
      .order('created_at', { ascending: false });
    return NextResponse.json({ documents: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// POST: upload a training document
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('training_documents').insert({
      title: body.title,
      document_type: body.document_type,
      content: body.content,
      campaign_type: body.campaign_type,
      persona_id: body.persona_id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ document: data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
