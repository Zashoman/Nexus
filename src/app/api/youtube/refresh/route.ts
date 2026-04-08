import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
}

// This endpoint is called by cron job only — NOT on page load
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!YT_API_KEY) {
    return NextResponse.json({ error: 'No YouTube API key' }, { status: 500 });
  }

  const db = getServiceSupabase();
  const { data: channels } = await db
    .from('intel_youtube_channels')
    .select('*')
    .eq('is_active', true);

  if (!channels || channels.length === 0) {
    return NextResponse.json({ message: 'No channels' });
  }

  let newVideos = 0;
  const errors: string[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const channel of channels) {
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?channelId=${channel.channel_id}&part=snippet&order=date&maxResults=5&type=video&publishedAfter=${sevenDaysAgo}&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!searchRes.ok) {
        if (searchRes.status === 403) {
          errors.push('API quota exceeded — stopping');
          break;
        }
        errors.push(`${channel.channel_name}: ${searchRes.status}`);
        continue;
      }

      const searchData = await searchRes.json();
      const items = searchData.items || [];
      if (items.length === 0) continue;

      // Get durations to filter shorts
      const videoIds = items.map((item: Record<string, Record<string, string>>) => item.id?.videoId).filter(Boolean);
      let durations: Record<string, number> = {};

      if (videoIds.length > 0) {
        try {
          const detailRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=contentDetails&key=${YT_API_KEY}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            for (const d of detailData.items || []) {
              durations[d.id] = parseDuration(d.contentDetails?.duration || '');
            }
          }
        } catch {
          // Allow through if duration check fails
        }
      }

      for (const item of items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;

        const snippet = item.snippet;
        const title = snippet.title || '';

        // Skip shorts
        const duration = durations[videoId] || 0;
        if (duration > 0 && duration < 180) continue;
        if (title.toLowerCase().includes('#shorts') || title.toLowerCase().includes('#short')) continue;

        // Skip if already exists
        const { data: existing } = await db
          .from('intel_youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();
        if (existing) continue;

        const description = (snippet.description || '').slice(0, 1000);
        const miniSummary = description.length > 0
          ? description.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 2).join(' ').slice(0, 200)
          : null;

        const { error: insertError } = await db.from('intel_youtube_videos').insert({
          video_id: videoId,
          channel_id: channel.channel_id,
          channel_name: channel.channel_name,
          category: channel.category,
          title,
          description,
          published_at: snippet.publishedAt || null,
          thumbnail_url: snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          mini_summary: miniSummary,
        });

        if (!insertError) newVideos++;
        else if (insertError.code !== '23505') {
          errors.push(`${channel.channel_name}: ${insertError.message}`);
        }
      }
    } catch (err) {
      errors.push(`${channel.channel_name}: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  return NextResponse.json({ new_videos: newVideos, channels: channels.length, errors: errors.length > 0 ? errors : undefined });
}
