import { NextResponse } from 'next/server';
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

  for (const channel of channels) {
    try {
      const feed = await parser.parseURL(channel.rss_url);

      // Collect candidate video IDs for duration check
      const candidates: { videoId: string; item: (typeof feed.items)[number] }[] = [];

      for (const item of (feed.items || []).slice(0, 10)) {
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

        candidates.push({ videoId, item });
      }

      if (candidates.length === 0) continue;

      // Check durations to filter out Shorts (under 2 minutes)
      const videoIds = candidates.map((c) => c.videoId);
      const durations = await getVideoDurations(videoIds);

      for (const { videoId, item } of candidates) {
        const duration = durations[videoId] || 0;
        // Skip Shorts and very short videos (under 120 seconds)
        if (duration > 0 && duration < 120) continue;

        const description = (item.contentSnippet || item.content || '').slice(0, 1000);

        const miniSummary = description.length > 0
          ? description.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 2).join(' ').slice(0, 200)
          : null;

        await db.from('intel_youtube_videos').insert({
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
        newVideos++;
      }
    } catch {
      // Skip failed channels
    }
  }

  // Return only recent videos (last 7 days)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: videos } = await db
    .from('intel_youtube_videos')
    .select('*')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    videos: videos || [],
    channels: channels || [],
    new_videos: newVideos,
  });
}
