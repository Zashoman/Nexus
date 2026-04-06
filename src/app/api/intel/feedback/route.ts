import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET — list all feedback entries
export async function GET(req: NextRequest) {
  const db = getServiceSupabase();
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50');
  const offset = (page - 1) * limit;

  const { data, error, count } = await db
    .from('intel_feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

// POST — add new feedback
export async function POST(req: NextRequest) {
  const db = getServiceSupabase();
  const body = await req.json();

  const { item_id, item_title, source_name, category, rating, feedback_note } = body;
  if (!feedback_note?.trim()) {
    return NextResponse.json({ error: 'feedback_note required' }, { status: 400 });
  }

  const { data, error } = await db
    .from('intel_feedback')
    .insert({
      item_id: item_id || null,
      item_title: item_title || null,
      source_name: source_name || null,
      category: category || null,
      rating: rating || null,
      feedback_note: feedback_note.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, success: true });
}

// PUT — update existing feedback
export async function PUT(req: NextRequest) {
  const db = getServiceSupabase();
  const body = await req.json();
  const { id, feedback_note, rating } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (feedback_note !== undefined) updates.feedback_note = feedback_note;
  if (rating !== undefined) updates.rating = rating;

  const { data, error } = await db
    .from('intel_feedback')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, success: true });
}

// DELETE — remove feedback entry
export async function DELETE(req: NextRequest) {
  const db = getServiceSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await db.from('intel_feedback').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
