import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function getTranscript(videoId: string): Promise<string> {
  // Method 1: Try youtube-transcript package
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      return items.map((item: { text: string }) => item.text).join(' ');
    }
  } catch {
    // Failed, try next method
  }

  // Method 2: Try Invidious instances for captions
  const invidiousInstances = [
    'https://vid.puffyan.us',
    'https://invidious.lunar.icu',
    'https://inv.tux.pizza',
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(
        `${instance}/api/v1/captions/${videoId}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const captions = await res.json();
        if (captions && captions.captions && captions.captions.length > 0) {
          const enCaption = captions.captions.find(
            (c: { language_code: string }) => c.language_code === 'en' || c.language_code === 'en-US'
          ) || captions.captions[0];

          if (enCaption && enCaption.url) {
            const captionUrl = enCaption.url.startsWith('http')
              ? enCaption.url
              : `${instance}${enCaption.url}`;
            const captionRes = await fetch(`${captionUrl}&fmt=vtt`, {
              signal: AbortSignal.timeout(8000),
            });
            if (captionRes.ok) {
              const vtt = await captionRes.text();
              const lines = vtt.split('\n');
              const textLines = lines.filter(
                (line: string) =>
                  line.trim() &&
                  !line.includes('-->') &&
                  !line.startsWith('WEBVTT') &&
                  !line.match(/^\d+$/) &&
                  !line.startsWith('Kind:') &&
                  !line.startsWith('Language:')
              );
              const transcript = textLines.join(' ').replace(/<[^>]*>/g, '').trim();
              if (transcript.length > 100) return transcript;
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Method 3: Try getting full description from Invidious
  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.description && data.description.length > 50) {
          return `[Video Description] ${data.description}`;
        }
      }
    } catch {
      continue;
    }
  }

  return '';
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

  const transcript = await getTranscript(video_id);
  const content = transcript.length > 100 ? transcript : (video.description || '');
  const isTranscript = transcript.length > 100 && !transcript.startsWith('[Video Description]');
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
${isTranscript ? 'Transcript' : 'Description'}: ${content.slice(0, 3000)}`,
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
Source: ${isTranscript ? 'Full transcript' : 'Video description (transcript unavailable)'}
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
- ${isTranscript ? 'You have the full transcript — provide a thorough analysis.' : 'Working from description only — keep it concise and note that full transcript was unavailable.'}
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
