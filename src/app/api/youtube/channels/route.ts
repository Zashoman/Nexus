import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('intel_youtube_channels')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channels: data || [] });
}

export async function POST(req: NextRequest) {
  const db = getServiceSupabase();
  const body = await req.json();

  const { channel_id, channel_name, category } = body;
  if (!channel_id || !channel_name || !category) {
    return NextResponse.json({ error: 'channel_id, channel_name, and category required' }, { status: 400 });
  }

  const rss_url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

  const { data, error } = await db
    .from('intel_youtube_channels')
    .insert({ channel_id, channel_name, category, rss_url })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channel: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  await db.from('intel_youtube_channels').update({ is_active: false }).eq('id', id);
  return NextResponse.json({ success: true });
}
