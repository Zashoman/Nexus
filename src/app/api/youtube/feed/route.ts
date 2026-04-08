import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCached, setCache } from '@/lib/dashboard/cache';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  const secs = parseInt(match[3] || '0');
  return hours * 3600 + mins * 60 + secs;
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const errors: string[] = [];

  if (!YT_API_KEY) {
    errors.push('No YouTube API key configured');
  } else {
    // Check if we already fetched recently (cache for 2 hours to save API quota)
    const lastFetchKey = 'youtube_last_fetch';
    const lastFetch = await getCached(lastFetchKey);

    if (!lastFetch) {
      // Only fetch from YouTube API if cache expired (every 2 hours)
      for (const channel of channels) {
        try {
          const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?channelId=${channel.channel_id}&part=snippet&order=date&maxResults=5&type=video&publishedAfter=${sevenDaysAgo}&key=${YT_API_KEY}`,
            { signal: AbortSignal.timeout(15000) }
          );

          if (!searchRes.ok) {
            const errData = await searchRes.json().catch(() => ({}));
            if (searchRes.status === 403) {
              errors.push(`${channel.channel_name}: API quota exceeded`);
              break; // Stop fetching all channels if quota hit
            }
            errors.push(`${channel.channel_name}: YouTube API ${searchRes.status}`);
            continue;
          }

          const searchData = await searchRes.json();
          const items = searchData.items || [];

          if (items.length === 0) continue;

          // Get video details (duration) to filter shorts
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
                for (const item of detailData.items || []) {
                  durations[item.id] = parseDuration(item.contentDetails?.duration || '');
                }
              }
            } catch {
              // Duration check failed
            }
          }

          for (const item of items) {
            const videoId = item.id?.videoId;
            if (!videoId) continue;

            const snippet = item.snippet;
            const title = snippet.title || '';

            // Skip Shorts
            const duration = durations[videoId] || 0;
            if (duration > 0 && duration < 180) continue;
            if (title.toLowerCase().includes('#shorts') || title.toLowerCase().includes('#short')) continue;

            // Check if already exists
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
              title: title,
              description,
              published_at: snippet.publishedAt || null,
              thumbnail_url: snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              video_url: `https://www.youtube.com/watch?v=${videoId}`,
              mini_summary: miniSummary,
            });

            if (insertError && insertError.code !== '23505') {
              errors.push(`${channel.channel_name}: insert - ${insertError.message}`);
            } else if (!insertError) {
              newVideos++;
            }
          }
        } catch (err) {
          errors.push(`${channel.channel_name}: ${err instanceof Error ? err.message : 'Failed'}`);
        }
      }

      // Cache that we just fetched — don't fetch again for 2 hours
      await setCache(lastFetchKey, { fetched_at: new Date().toISOString() }, 'youtube', 120);
    }
  }

  // Always return videos from database regardless of API status
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: videos } = await db
    .from('intel_youtube_videos')
    .select('*')
    .gte('published_at', cutoff)
    .neq('is_dismissed', true)
    .order('published_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    videos: videos || [],
    channels: channels || [],
    new_videos: newVideos,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function DELETE(req: NextRequest) {
  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("video_id");

  if (!videoId) {
    return NextResponse.json({ error: "video_id required" }, { status: 400 });
  }

  await db.from("intel_youtube_videos").update({ is_dismissed: true }).eq("video_id", videoId);
  return NextResponse.json({ success: true });
}
