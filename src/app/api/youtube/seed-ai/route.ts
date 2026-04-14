import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// One-time seed for AI YouTube channels
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();

  const channels = [
    {
      channel_id: 'UCsd720D4RJCxYThPhEVbSQg',
      channel_name: 'AI Daily Brief',
      category: 'AI',
      rss_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsd720D4RJCxYThPhEVbSQg',
    },
    {
      channel_id: 'UCbfYPyITQ-7l4upoX8nvctg',
      channel_name: 'Two Minute Papers',
      category: 'AI',
      rss_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg',
    },
    {
      channel_id: 'UCawZsQWqfGSbCI5yjkdVkTA',
      channel_name: 'Matthew Berman',
      category: 'AI',
      rss_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCawZsQWqfGSbCI5yjkdVkTA',
    },
  ];

  const results = [];
  for (const ch of channels) {
    // Check if already exists
    const { data: existing } = await db
      .from('intel_youtube_channels')
      .select('id')
      .eq('channel_id', ch.channel_id)
      .single();

    if (existing) {
      // Reactivate if soft-deleted
      await db
        .from('intel_youtube_channels')
        .update({ is_active: true, category: 'AI' })
        .eq('channel_id', ch.channel_id);
      results.push({ ...ch, status: 'reactivated' });
    } else {
      const { error } = await db
        .from('intel_youtube_channels')
        .insert(ch);
      results.push({ ...ch, status: error ? `error: ${error.message}` : 'added' });
    }
  }

  return NextResponse.json({ channels: results });
}
