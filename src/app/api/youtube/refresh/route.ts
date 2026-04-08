import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
}

// Derive uploads playlist ID from channel ID: UC... -> UU...
function getUploadsPlaylistId(channelId: string): string {
  if (channelId.startsWith('UC')) {
    return 'UU' + channelId.slice(2);
  }
  return channelId;
}

// Uses PlaylistItems API (1 unit/call) instead of Search API (100 units/call)
// 19 channels = ~40 units per refresh instead of ~1,900
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isManual = req.headers.get('x-manual-refresh') === 'true';

  if (!isManual && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!YT_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY not set' }, { status: 500 });
  }

  const db = getServiceSupabase();
  const { data: channels, error: dbErr } = await db
    .from('intel_youtube_channels')
    .select('*')
    .eq('is_active', true);

  if (dbErr) {
    return NextResponse.json({ error: 'DB error: ' + dbErr.message }, { status: 500 });
  }

  if (!channels || channels.length === 0) {
    return NextResponse.json({ error: 'No active channels in database' });
  }

  let newVideos = 0;
  let skippedShorts = 0;
  let skippedExisting = 0;
  const errors: string[] = [];
  const channelResults: Record<string, string> = {};
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const channel of channels) {
    try {
      // Derive uploads playlist ID directly from channel ID (no API call needed)
      const uploadsPlaylistId = getUploadsPlaylistId(channel.channel_id);

      // Fetch recent uploads (1 quota unit)
      const playlistRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsPlaylistId}&part=snippet,contentDetails&maxResults=10&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!playlistRes.ok) {
        if (playlistRes.status === 403) {
          const errBody = await playlistRes.json().catch(() => ({}));
          const reason = (errBody as any)?.error?.errors?.[0]?.reason || 'unknown';
          if (reason === 'quotaExceeded') {
            errors.push('QUOTA EXCEEDED - stopping');
            break;
          }
          errors.push(`${channel.channel_name}: 403 (${reason})`);
          continue;
        }
        if (playlistRes.status === 404) {
          errors.push(`${channel.channel_name}: playlist not found (bad channel ID? ${channel.channel_id})`);
          channelResults[channel.channel_name] = 'BAD_ID';
          continue;
        }
        errors.push(`${channel.channel_name}: HTTP ${playlistRes.status}`);
        channelResults[channel.channel_name] = `ERR_${playlistRes.status}`;
        continue;
      }

      const playlistData = await playlistRes.json();
      const items: any[] = playlistData.items || [];

      if (items.length === 0) {
        channelResults[channel.channel_name] = '0 uploads';
        continue;
      }

      // Filter to videos from last 7 days
      const recentItems = items.filter((item: any) => {
        const pub = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
        return pub && new Date(pub) >= sevenDaysAgo;
      });

      if (recentItems.length === 0) {
        channelResults[channel.channel_name] = '0 recent';
        continue;
      }

      // Get durations to filter shorts (1 quota unit for batched call)
      const videoIds = recentItems
        .map((item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
        .filter(Boolean);

      const durations: Record<string, number> = {};
      if (videoIds.length > 0) {
        try {
          const detailRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=contentDetails&key=${YT_API_KEY}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            for (const d of (detailData.items || [])) {
              durations[d.id] = parseDuration(d.contentDetails?.duration || '');
            }
          }
        } catch {
          // duration check failed — allow videos through
        }
      }

      let channelNew = 0;
      for (const item of recentItems) {
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (!videoId) continue;

        const snippet = item.snippet;
        const title: string = snippet?.title || '';

        // Skip shorts
        const duration = durations[videoId] || 0;
        if (duration > 0 && duration < 180) { skippedShorts++; continue; }
        if (title.toLowerCase().includes('#shorts') || title.toLowerCase().includes('#short')) { skippedShorts++; continue; }

        // Skip if already in DB (including dismissed)
        const { data: existing } = await db
          .from('intel_youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();
        if (existing) { skippedExisting++; continue; }

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
          errors.push(`${channel.channel_name}: insert error - ${insertError.message}`);
        }
      }
      channelResults[channel.channel_name] = `+${channelNew} new`;
    } catch (err) {
      errors.push(`${channel.channel_name}: ${err instanceof Error ? err.message : 'Failed'}`);
      channelResults[channel.channel_name] = 'EXCEPTION';
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
