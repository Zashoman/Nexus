import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import RSSParser from 'rss-parser';

const parser = new RSSParser({
  timeout: 15000,
  headers: { 'User-Agent': 'NexusBot/1.0' },
});

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  const secs = parseInt(match[3] || '0');
  return hours * 3600 + mins * 60 + secs;
}

async function getVideoDurations(videoIds: string[]): Promise<Record<string, number>> {
  if (!YT_API_KEY || videoIds.length === 0) return {};
  const durations: Record<string, number> = {};
  try {
    const ids = videoIds.join(',');
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${ids}&part=contentDetails&key=${YT_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json();
      for (const item of data.items || []) {
        durations[item.id] = parseDuration(item.contentDetails?.duration || '');
      }
    }
  } catch {
    // Silent
  }
  return durations;
}

export async function GET() {
  const db = getServiceSupabase();

  const { data: channels } = await db
    .from('intel_youtube_channels')
    .select('*')
    .eq('is_active', true);

  if (!channels || channels.length === 0) {
    return NextResponse.json({ videos: [], channels: [] });
  }

  let newVideos = 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const errors: string[] = [];

  for (const channel of channels) {
    try {
      const feed = await parser.parseURL(channel.rss_url);
      const feedItems = feed.items || [];

      for (const item of feedItems.slice(0, 10)) {
        const videoId = item.id?.split(':').pop() || '';
        if (!videoId) continue;

        const pubDate = item.isoDate || item.pubDate;
        if (pubDate && new Date(pubDate).getTime() < sevenDaysAgo) continue;

        const { data: existing } = await db
          .from('intel_youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();

        if (existing) continue;

        // Try to check duration to filter shorts, but don't block if it fails
        let isShort = false;
        try {
          const durations = await getVideoDurations([videoId]);
          const dur = durations[videoId] || 0;
          if (dur > 0 && dur < 120) isShort = true;
        } catch {
          // Duration check failed, allow the video through
        }

        if (isShort) continue;

        const description = (item.contentSnippet || item.content || '').slice(0, 1000);

        const miniSummary = description.length > 0
          ? description.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 2).join(' ').slice(0, 200)
          : null;

        const { error: insertError } = await db.from('intel_youtube_videos').insert({
          video_id: videoId,
          channel_id: channel.channel_id,
          channel_name: channel.channel_name,
          category: channel.category,
          title: item.title || 'Untitled',
          description,
          published_at: item.isoDate || item.pubDate || null,
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          mini_summary: miniSummary,
        });

        if (insertError) {
          if (insertError.code !== '23505') {
            errors.push(`${channel.channel_name}: insert error - ${insertError.message}`);
          }
        } else {
          newVideos++;
        }
      }
    } catch (err) {
      errors.push(`${channel.channel_name}: ${err instanceof Error ? err.message : 'RSS parse failed'}`);
    }
  }

  // Return only recent videos (last 7 days), exclude dismissed
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: videos, error: queryError } = await db
    .from('intel_youtube_videos')
    .select('*')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    videos: videos || [],
    channels: channels || [],
    new_videos: newVideos,
    errors: errors.length > 0 ? errors : undefined,
    query_error: queryError?.message || undefined,
  });
}

export async function DELETE(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("video_id");

  if (!videoId) {
    return NextResponse.json({ error: "video_id required" }, { status: 400 });
  }

  // Soft-delete: mark as dismissed instead of removing, so RSS re-fetch doesn't re-add it
  await db.from("intel_youtube_videos").update({ dismissed: true }).eq("video_id", videoId);
  return NextResponse.json({ success: true });
}
