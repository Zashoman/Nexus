import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

/* eslint-disable @typescript-eslint/no-explicit-any */
type YTItem = any;

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
}

// Uses PlaylistItems API (1 unit/call) instead of Search API (100 units/call)
// 19 channels = ~40 units per refresh instead of ~1,900
export async function GET(req: NextRequest) {
  // Verify cron secret OR manual trigger header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isManual = req.headers.get('x-manual-refresh') === 'true';

  if (!isManual && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    return NextResponse.json({ message: 'No active channels' });
  }

  let newVideos = 0;
  let skippedShorts = 0;
  let skippedExisting = 0;
  const errors: string[] = [];
  const channelResults: Record<string, number> = {};
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const channel of channels) {
    try {
      // Step 1: Get the uploads playlist ID for this channel (1 quota unit)
      let uploadsPlaylistId = channel.uploads_playlist_id;

      if (!uploadsPlaylistId) {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?id=${channel.channel_id}&part=contentDetails&key=${YT_API_KEY}`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (!channelRes.ok) {
          if (channelRes.status === 403) {
            errors.push('API quota exceeded - stopping all channels');
            break;
          }
          errors.push(`${channel.channel_name}: channel lookup ${channelRes.status}`);
          continue;
        }

        const channelData = await channelRes.json();
        if (!channelData.items || channelData.items.length === 0) {
          errors.push(`${channel.channel_name}: channel not found (ID: ${channel.channel_id})`);
          continue;
        }

        uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) {
          errors.push(`${channel.channel_name}: no uploads playlist found`);
          continue;
        }

        // Cache it so we don't need to look it up again
        try {
          await db
            .from('intel_youtube_channels')
            .update({ uploads_playlist_id: uploadsPlaylistId })
            .eq('id', channel.id);
        } catch {
          // Column may not exist yet — that's fine, we'll just look it up each time
        }
      }

      // Step 2: Get recent videos from uploads playlist (1 quota unit)
      const playlistRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsPlaylistId}&part=snippet,contentDetails&maxResults=10&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!playlistRes.ok) {
        if (playlistRes.status === 403) {
          errors.push('API quota exceeded - stopping all channels');
          break;
        }
        errors.push(`${channel.channel_name}: playlist fetch ${playlistRes.status}`);
        continue;
      }

      const playlistData = await playlistRes.json();
      const items = playlistData.items || [];

      if (items.length === 0) {
        channelResults[channel.channel_name] = 0;
        continue;
      }

      // Filter to only videos from last 7 days
      const recentItems = items.filter((item: YTItem) => {
        const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
        return publishedAt && new Date(publishedAt) >= sevenDaysAgo;
      });

      if (recentItems.length === 0) {
        channelResults[channel.channel_name] = 0;
        continue;
      }

      // Step 3: Get durations to filter shorts (1 quota unit for batch)
      const videoIds = recentItems
        .map((item: YTItem) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
        .filter(Boolean);

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
          // If duration check fails, still allow videos through
        }
      }

      let channelNew = 0;
      for (const item of recentItems) {
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (!videoId) continue;

        const snippet = item.snippet;
        const title = snippet?.title || '';

        // Skip shorts (under 3 minutes or tagged)
        const duration = durations[videoId] || 0;
        if (duration > 0 && duration < 180) {
          skippedShorts++;
          continue;
        }
        if (title.toLowerCase().includes('#shorts') || title.toLowerCase().includes('#short')) {
          skippedShorts++;
          continue;
        }

        // Skip if already exists (including dismissed ones)
        const { data: existing } = await db
          .from('intel_youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();
        if (existing) {
          skippedExisting++;
          continue;
        }

        const description = (snippet?.description || '').slice(0, 1000);
        const publishedAt = item.contentDetails?.videoPublishedAt || snippet?.publishedAt || null;

        const { error: insertError } = await db.from('intel_youtube_videos').insert({
          video_id: videoId,
          channel_id: channel.channel_id,
          channel_name: channel.channel_name,
          category: channel.category,
          title,
          description,
          published_at: publishedAt,
          thumbnail_url: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          mini_summary: description.length > 0
            ? description.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 2).join(' ').slice(0, 200)
            : null,
        });

        if (!insertError) {
          channelNew++;
          newVideos++;
        } else if (insertError.code !== '23505') {
          errors.push(`${channel.channel_name}: insert ${insertError.message}`);
        }
      }
      channelResults[channel.channel_name] = channelNew;
    } catch (err) {
      errors.push(`${channel.channel_name}: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  return NextResponse.json({
    new_videos: newVideos,
    channels_checked: channels.length,
    channel_results: channelResults,
    skipped_shorts: skippedShorts,
    skipped_existing: skippedExisting,
    errors: errors.length > 0 ? errors : undefined,
  });
}
