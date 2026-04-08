import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// This endpoint ONLY reads from the database
// YouTube API calls happen in /api/youtube/refresh (cron job every 6 hours)
export async function GET() {
  const db = getServiceSupabase();

  const { data: channels } = await db
    .from('intel_youtube_channels')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });

  // Return videos from last 7 days, exclude dismissed
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
  });
}

// Mark video as dismissed (not deleted — prevents re-insertion)
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
