import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

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

  let { channel_id, channel_name, category } = body;
  const handle = body.handle as string | undefined;

  // If a handle is provided (e.g. "@intothecryptoverse" or "intothecryptoverse"), look up the channel ID
  if (handle && !channel_id && YT_API_KEY) {
    const cleanHandle = handle.replace(/^@/, '').replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, '').replace(/\/.*$/, '').trim();

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=@${cleanHandle}&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          channel_id = data.items[0].id;
          if (!channel_name) {
            channel_name = data.items[0].snippet?.title || cleanHandle;
          }
        } else {
          return NextResponse.json({ error: `Channel not found for handle: @${cleanHandle}` }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'YouTube API lookup failed' }, { status: 500 });
      }
    } catch {
      return NextResponse.json({ error: 'YouTube API lookup failed' }, { status: 500 });
    }
  }

  if (!channel_id || !channel_name || !category) {
    return NextResponse.json({ error: 'channel_id (or handle), channel_name, and category required' }, { status: 400 });
  }

  const rss_url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

  const { data, error } = await db
    .from('intel_youtube_channels')
    .insert({ channel_id, channel_name, category, rss_url })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Channel already exists' }, { status: 409 });
    }
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
