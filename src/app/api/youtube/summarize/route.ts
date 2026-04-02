import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

  // Return cached summary if exists
  if (mode === 'full' && video.full_summary) {
    return NextResponse.json({ summary: video.full_summary });
  }
  if (mode === 'mini' && video.mini_summary) {
    return NextResponse.json({ summary: video.mini_summary });
  }

  // Fetch transcript from a free transcript API
  let transcript = '';
  try {
    const transcriptRes = await fetch(
      `https://yt-api.p.rapidapi.com/video/transcript?videoId=${video_id}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'yt-api.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (transcriptRes.ok) {
      const data = await transcriptRes.json();
      if (data.subtitles) {
        transcript = data.subtitles.map((s: { text: string }) => s.text).join(' ');
      }
    }
  } catch {
    // Transcript fetch failed — use description as fallback
  }

  // Fallback to description if no transcript
  const content = transcript.length > 100 ? transcript : (video.description || video.title);
  const contentSlice = content.slice(0, 6000);

  if (mode === 'mini') {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Summarize this YouTube video in 2-3 sentences. Be direct and factual.\n\nTitle: ${video.title}\nChannel: ${video.channel_name}\nContent: ${contentSlice.slice(0, 1500)}`,
        }],
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text : '';
      await db.from('intel_youtube_videos').update({ mini_summary: summary }).eq('video_id', video_id);
      return NextResponse.json({ summary });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
    }
  }

  // Full summary mode
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are summarizing a YouTube video for a tech investor and entrepreneur. Create a detailed summary.

Title: ${video.title}
Channel: ${video.channel_name}
Category: ${video.category}
Content/Transcript: ${contentSlice}

Write a 600-800 word summary using this EXACT format:

OVERVIEW: [2-3 sentences — what this video covers and the creator's main argument]

KEY ARGUMENTS:
- [Main point 1 with supporting detail]
- [Main point 2 with supporting detail]
- [Main point 3 with supporting detail]
- [Main point 4 if applicable]
- [Main point 5 if applicable]

DETAILED SUMMARY: [400-500 words covering the full content of the video in a flowing narrative. Include specific examples, data points, and arguments made by the creator. Do not pad — if the source content is thin, write a shorter summary.]

NOTABLE QUOTES/CLAIMS:
- [Specific claim, prediction, or notable statement 1]
- [Specific claim, prediction, or notable statement 2]
- [Specific claim, prediction, or notable statement 3]

BOTTOM LINE: [1-2 sentences — is this worth watching in full? Who should watch it?]

RULES:
- Only summarize what is actually in the content. Never fabricate claims or data.
- If working from a description rather than a full transcript, note this and keep it shorter.
- Be analytical, not promotional. If the creator makes weak arguments, note that.`,
      }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';
    await db.from('intel_youtube_videos').update({ full_summary: summary }).eq('video_id', video_id);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
