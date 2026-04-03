import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { YoutubeTranscript } from 'youtube-transcript';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function getTranscript(videoId: string): Promise<string> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    return items.map((item: { text: string }) => item.text).join(' ');
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const { video_id, mode } = await req.json() as { video_id: string; mode: 'mini' | 'full' };

  if (!video_id) {
    return NextResponse.json({ error: 'video_id required' }, { status: 400 });
  }

  const db = getServiceSupabase();

  const { data: video, error } = await db
    .from('intel_youtube_videos')
    .select('*')
    .eq('video_id', video_id)
    .single();

  if (error || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  if (mode === 'full' && video.full_summary) {
    return NextResponse.json({ summary: video.full_summary });
  }
  if (mode === 'mini' && video.mini_summary && video.mini_summary.length > 50) {
    return NextResponse.json({ summary: video.mini_summary });
  }

  // Fetch transcript
  const transcript = await getTranscript(video_id);
  const content = transcript.length > 100 ? transcript : (video.description || video.title);
  const isTranscript = transcript.length > 100;

  if (mode === 'mini') {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Summarize this YouTube video in 2-3 sentences. Be direct and factual. Focus on what the creator is arguing or presenting.\n\nTitle: ${video.title}\nChannel: ${video.channel_name}\n${isTranscript ? 'Transcript' : 'Description'}: ${content.slice(0, 3000)}`,
        }],
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text : '';
      await db.from('intel_youtube_videos').update({ mini_summary: summary }).eq('video_id', video_id);
      return NextResponse.json({ summary });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are summarizing a YouTube video for a tech investor and entrepreneur. Create a detailed summary.\n\nTitle: ${video.title}\nChannel: ${video.channel_name}\nCategory: ${video.category}\nSource: ${isTranscript ? 'Full transcript' : 'Video description only (transcript unavailable)'}\nContent: ${content.slice(0, 8000)}\n\nWrite a 600-800 word summary using this EXACT format:\n\nOVERVIEW: [2-3 sentences \u2014 what this video covers and the creator's main argument]\n\nKEY ARGUMENTS:\n- [Main point 1 with supporting detail]\n- [Main point 2 with supporting detail]\n- [Main point 3 with supporting detail]\n- [Main point 4 if applicable]\n- [Main point 5 if applicable]\n\nDETAILED SUMMARY: [400-500 words covering the full content of the video in a flowing narrative. Include specific examples, data points, and arguments made by the creator. Do not pad \u2014 if the source content is thin, write a shorter summary.]\n\nNOTABLE QUOTES/CLAIMS:\n- [Specific claim, prediction, or notable statement 1]\n- [Specific claim, prediction, or notable statement 2]\n- [Specific claim, prediction, or notable statement 3]\n\nBOTTOM LINE: [1-2 sentences \u2014 is this worth watching in full? Who should watch it?]\n\nRULES:\n- Only summarize what is actually in the content. Never fabricate claims or data.\n- ${isTranscript ? 'You have the full transcript \u2014 provide a thorough analysis.' : 'Working from description only \u2014 keep it concise and note that full transcript was unavailable.'}\n- Be analytical, not promotional. If the creator makes weak arguments, note that.`,
      }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';
    await db.from('intel_youtube_videos').update({ full_summary: summary }).eq('video_id', video_id);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
