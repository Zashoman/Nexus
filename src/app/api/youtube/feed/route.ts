import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import RSSParser from 'rss-parser';

const parser = new RSSParser({
  timeout: 15000,
  headers: { 'User-Agent': 'NexusBot/1.0' },
});

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

  for (const channel of channels) {
    try {
      const feed = await parser.parseURL(channel.rss_url);

      // Only include videos from the last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const item of (feed.items || []).slice(0, 10)) {
        const videoId = item.id?.split(':').pop() || '';
        if (!videoId) continue;

        // Skip videos older than 7 days
        const pubDate = item.isoDate || item.pubDate;
        if (pubDate && new Date(pubDate).getTime() < sevenDaysAgo) continue;

        // Check if already exists
        const { data: existing } = await db
          .from('intel_youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();

        if (existing) continue;

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
