import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SUPADATA_KEY = process.env.SUPADATA_API_KEY;
const YT_API_KEY = process.env.YOUTUBE_API_KEY;

async function getVideoContent(videoId: string): Promise<{ content: string; isTranscript: boolean }> {
  if (SUPADATA_KEY) {
    try {
      const res = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&lang=en&text=true`,
        {
          headers: { 'x-api-key': SUPADATA_KEY },
          signal: AbortSignal.timeout(30000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.content && data.content.length > 100) {
          return { content: data.content, isTranscript: true };
        }
      }
    } catch {
      // Failed, try next method
    }
  }

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
          if (snippet.description) parts.push(`Description: ${snippet.description}`);
          if (snippet.tags && snippet.tags.length > 0) parts.push(`Tags: ${snippet.tags.join(', ')}`);
          if (details && details.duration) parts.push(`Duration: ${details.duration}`);
          const content = parts.join('\n\n');
          if (content.length > 50) return { content, isTranscript: false };
        }
      }
    } catch {
      // Failed
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
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Summarize this YouTube video in 4-6 sentences. Be direct and factual. Cover the main argument, key supporting points, and the conclusion or call to action. Include any specific numbers, predictions, or data points mentioned.

Title: ${video.title}
Channel: ${video.channel_name}
${isTranscript ? 'Transcript' : 'Video Info'}: ${content.slice(0, 4000)}`,
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
      max_tokens: 5000,
      messages: [{
        role: 'user',
        content: `Analyze this video. Write approximately 850 words total. Be comprehensive but efficient — the reader should feel like they watched the video.

Title: ${video.title}
Channel: ${video.channel_name}
Category: ${video.category}
${isTranscript ? 'TRANSCRIPT' : 'VIDEO DESCRIPTION'}:
${content.slice(0, 15000)}

---

## THESIS (2-3 sentences)
State the speaker's central argument. What do they believe is happening or will happen, and why?

## KEY POINTS (bulk of the summary — ~500 words)
Cover the 4-6 most important arguments, narratives, or insights from the video. For each:
- Explain the point clearly with context and reasoning
- Include specific data, numbers, names, or examples the speaker uses
- Connect it to the broader thesis

Write this as flowing paragraphs, not bullet lists. The reader should understand the full logic chain and evidence presented.

## DATA & CLAIMS
List every specific number, statistic, date, price, percentage, company name, or verifiable claim. Keep this tight — one line per data point.

## CRITICAL TAKE (~150 words)
Step outside the speaker's framing:
- Which 1-2 arguments are strongest and why?
- Which 1-2 are weakest or most speculative?
- One-line overall credibility assessment

## ACTIONABLE TAKEAWAYS
2-4 specific actions, trades, strategies, or decisions the speaker recommends or implies. Include timeframes and caveats if given.

---

RULES:
- Target ~850 words. No padding, no filler.
- Only analyze what is ACTUALLY in the content. Never fabricate.
- ${isTranscript ? 'Full transcript available — be thorough.' : 'Working from description only — note this and keep proportional.'}
- Use direct quotes where they strengthen the analysis.
- Be analytical and objective. Call out weak arguments clearly.`,
      }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';
    await db.from('intel_youtube_videos').update({ full_summary: summary }).eq('video_id', video_id);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
