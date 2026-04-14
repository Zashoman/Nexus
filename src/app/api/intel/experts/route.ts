import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  const db = getServiceSupabase();

  const { data: experts, error } = await db
    .from('intel_experts')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ experts: experts || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const body = await req.json();

  const { name, category, affiliation, blog_url, substack_url, twitter_handle, notes } = body;

  if (!name || !category) {
    return NextResponse.json(
      { error: 'name and category are required' },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from('intel_experts')
    .insert({
      name,
      category,
      affiliation: affiliation || null,
      blog_url: blog_url || null,
      substack_url: substack_url || null,
      twitter_handle: twitter_handle || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expert: data }, { status: 201 });
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

  const { error } = await db
    .from('intel_experts')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
