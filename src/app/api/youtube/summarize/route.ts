import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

async function getVideoContent(videoId: string): Promise<{ content: string; isTranscript: boolean }> {
  // Method 1: Try youtube-transcript package for full transcript
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      const transcript = items.map((item: { text: string }) => item.text).join(' ');
      if (transcript.length > 100) return { content: transcript, isTranscript: true };
    }
  } catch {
    // Failed, try next method
  }

  // Method 2: YouTube Data API — get full description, tags, duration
  if (YT_API_KEY) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const snippet = data.items[0].snippet;
          const details = data.items[0].contentDetails;
          const parts: string[] = [];

          if (snippet.description) {
            parts.push(`Description: ${snippet.description}`);
          }
          if (snippet.tags && snippet.tags.length > 0) {
            parts.push(`Tags: ${snippet.tags.join(', ')}`);
          }
          if (details && details.duration) {
            parts.push(`Duration: ${details.duration}`);
          }

          const content = parts.join('\n\n');
          if (content.length > 50) return { content, isTranscript: false };
        }
      }
    } catch {
      // Failed, try next method
    }
  }

  // Method 3: Invidious fallback
  const invidiousInstances = [
    'https://vid.puffyan.us',
    'https://invidious.lunar.icu',
    'https://inv.tux.pizza',
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.description && data.description.length > 50) {
          return { content: `Description: ${data.description}`, isTranscript: false };
        }
      }
    } catch {
      continue;
    }
  }

  return { content: '', isTranscript: false };
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
  if (mode === 'mini' && video.mini_summary && video.mini_summary.length > 80) {
    return NextResponse.json({ summary: video.mini_summary });
  }

  const { content, isTranscript } = await getVideoContent(video_id);
  const hasContent = content.length > 50;

  if (!hasContent) {
    const fallback = `This video from ${video.channel_name} titled "${video.title}" does not have accessible captions or a detailed description. Open the video on YouTube to watch it directly.`;
    return NextResponse.json({ summary: fallback });
  }

  if (mode === 'mini') {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Summarize this YouTube video in 2-3 sentences. Be direct and factual. Focus on what the creator is arguing or presenting.

Title: ${video.title}
Channel: ${video.channel_name}
${isTranscript ? 'Transcript' : 'Video Info'}: ${content.slice(0, 3000)}`,
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
        content: `You are summarizing a YouTube video for a tech investor and entrepreneur. Create a detailed summary.

Title: ${video.title}
Channel: ${video.channel_name}
Category: ${video.category}
Source: ${isTranscript ? 'Full transcript' : 'Video description and metadata'}
Content: ${content.slice(0, 8000)}

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
- ${isTranscript ? 'You have the full transcript — provide a thorough analysis.' : 'Working from description and metadata — analyze what the video covers based on available info. Note if transcript was unavailable.'}
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
