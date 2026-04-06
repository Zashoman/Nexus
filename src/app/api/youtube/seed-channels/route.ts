import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// Seed batch of YouTube channels across categories
export async function POST() {
  const db = getServiceSupabase();

  const channels = [
    // Finance / Macro
    { channel_id: 'UCESLZhusAkFfsNsApnjF_Cg', channel_name: 'All-In Podcast', category: 'Finance' },
    { channel_id: 'UC8URhgYos5fjHqFSO4RSIEg', channel_name: 'Hidden Forces', category: 'Finance' },
    { channel_id: 'UCASM0cgfkJxQ1ICmRilfHLw', channel_name: 'Patrick Boyle', category: 'Finance' },
    { channel_id: 'UCKMeK-HGHfUFFArZ91rzv5A', channel_name: 'Wealthion', category: 'Finance' },
    { channel_id: 'UC9T_qxz0g7FKhj6sXz2LKyQ', channel_name: 'The Jay Martin Show', category: 'Finance' },
    // Science / Health
    { channel_id: 'UCNI-0fgNoEhBn5gDqtW4zJA', channel_name: 'FoundMyFitness', category: 'Science' },
    // AI / Tech
    { channel_id: 'UCvKRFNawVcuz4b9ihUTApCg', channel_name: 'Dave Shapiro', category: 'AI' },
    // Geopolitics
    { channel_id: 'UCwnKziETDbHJtx78nIkfYug', channel_name: 'Caspian Report', category: 'Geopolitics' },
    // Tech / Explainers
    { channel_id: 'UC415bOPUcGSamy543abLmRA', channel_name: 'Cleo Abram', category: 'Tech' },
  ];

  const results = [];
  for (const ch of channels) {
    const rss_url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channel_id}`;

    const { data: existing } = await db
      .from('intel_youtube_channels')
      .select('id')
      .eq('channel_id', ch.channel_id)
      .single();

    if (existing) {
      await db
        .from('intel_youtube_channels')
        .update({ is_active: true, category: ch.category })
        .eq('channel_id', ch.channel_id);
      results.push({ ...ch, status: 'reactivated' });
    } else {
      const { error } = await db
        .from('intel_youtube_channels')
        .insert({ ...ch, rss_url, is_active: true });
      results.push({ ...ch, status: error ? `error: ${error.message}` : 'added' });
    }
  }

  return NextResponse.json({ channels: results });
}
