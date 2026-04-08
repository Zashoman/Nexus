import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

// Debug endpoint: shows all channels, tests YouTube API, returns detailed status
export async function GET() {
  const db = getServiceSupabase();

  const { data: channels, error: chError } = await db
    .from('intel_youtube_channels')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (chError) {
    return NextResponse.json({ error: 'DB error: ' + chError.message }, { status: 500 });
  }

  const { data: videos } = await db
    .from('intel_youtube_videos')
    .select('video_id, channel_name, title, published_at')
    .order('published_at', { ascending: false })
    .limit(10);

  const { count: totalVideos } = await db
    .from('intel_youtube_videos')
    .select('id', { count: 'exact', head: true });

  const { count: dismissedCount } = await db
    .from('intel_youtube_videos')
    .select('id', { count: 'exact', head: true })
    .eq('is_dismissed', true);

  // Test YouTube API with first channel
  let apiTest = 'not tested';
  if (YT_API_KEY && channels && channels.length > 0) {
    const testChannel = channels[0];
    const uploadsId = 'UU' + testChannel.channel_id.slice(2);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsId}&part=snippet&maxResults=1&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        apiTest = `OK - ${testChannel.channel_name} has ${data.pageInfo?.totalResults || 0} total uploads`;
      } else {
        const errData = await res.json().catch(() => ({}));
        apiTest = `FAILED ${res.status}: ${JSON.stringify(errData.error?.message || errData)}`;
      }
    } catch (err) {
      apiTest = `FAILED: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  } else if (!YT_API_KEY) {
    apiTest = 'NO API KEY SET';
  }

  return NextResponse.json({
    api_key_set: !!YT_API_KEY,
    api_test: apiTest,
    total_channels: channels?.length || 0,
    total_videos_in_db: totalVideos,
    dismissed_videos: dismissedCount,
    channels: (channels || []).map((c: Record<string, string>) => ({
      name: c.channel_name,
      id: c.channel_id,
      category: c.category,
      uploads_playlist: 'UU' + c.channel_id?.slice(2),
    })),
    recent_videos: videos || [],
  });
}
