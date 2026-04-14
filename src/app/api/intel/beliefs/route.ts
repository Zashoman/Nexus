import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const db = getServiceSupabase();

  const { data: beliefs, error } = await db
    .from('intel_beliefs')
    .select('*')
    .neq('status', 'retired')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ beliefs: beliefs || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const body = await req.json();

  const { title, description, category, initial_confidence } = body as {
    title: string;
    description: string;
    category: string;
    initial_confidence: number;
  };

  if (!title || !description || !category || initial_confidence == null) {
    return NextResponse.json(
      { error: 'title, description, category, and initial_confidence are required' },
      { status: 400 }
    );
  }

  const confidence = Math.max(5, Math.min(95, initial_confidence));

  const { data, error } = await db
    .from('intel_beliefs')
    .insert({
      title,
      description,
      category,
      initial_confidence: confidence,
      current_confidence: confidence,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ belief: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const body = await req.json();

  const { id, ...updates } = body as {
    id: string;
    title?: string;
    description?: string;
    status?: string;
  };

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error } = await db
    .from('intel_beliefs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ belief: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // Soft delete — retire the belief
  const { error } = await db
    .from('intel_beliefs')
    .update({ status: 'retired', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
