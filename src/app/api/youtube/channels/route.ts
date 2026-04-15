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

  // Normalize category to lowercase so "Health" and "health" don't create duplicate tabs
  const normalizedCategory = category.toLowerCase().trim();

  const rss_url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

  const { data, error } = await db
    .from('intel_youtube_channels')
    .insert({ channel_id, channel_name, category: normalizedCategory, rss_url })
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

// Normalize all existing channel categories to lowercase + also normalize videos
export async function PATCH() {
  const db = getServiceSupabase();

  // Fetch all channels
  const { data: channels, error: chErr } = await db
    .from('intel_youtube_channels')
    .select('id, channel_id, category');

  if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

  let channelsUpdated = 0;
  let videosUpdated = 0;

  for (const ch of channels || []) {
    const normalized = (ch.category || '').toLowerCase().trim();
    if (normalized && normalized !== ch.category) {
      // Update channel
      await db.from('intel_youtube_channels').update({ category: normalized }).eq('id', ch.id);
      channelsUpdated++;

      // Update any videos already ingested with the old-case category
      const { data: videoUpdate } = await db
        .from('intel_youtube_videos')
        .update({ category: normalized })
        .eq('channel_id', ch.channel_id)
        .neq('category', normalized)
        .select('id');
      videosUpdated += videoUpdate?.length || 0;
    }
  }

  return NextResponse.json({
    channels_updated: channelsUpdated,
    videos_updated: videosUpdated,
  });
}

export async function DELETE(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const name = searchParams.get('name');

  if (!id && !name) {
    return NextResponse.json({ error: 'id or name required' }, { status: 400 });
  }

  if (id) {
    await db.from('intel_youtube_channels').update({ is_active: false }).eq('id', id);
  } else if (name) {
    await db.from('intel_youtube_channels').update({ is_active: false }).eq('channel_name', name);
  }
  return NextResponse.json({ success: true });
}
