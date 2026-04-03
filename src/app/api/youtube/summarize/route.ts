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
        content: `Analyze the following video transcript. This analysis has two phases: first extract the content in depth (approximately 70% of your response), then critically evaluate it (approximately 30%). Phase 1 should be comprehensive and detailed — the reader should feel like they watched the entire video. Phase 2 should be sharp and concise.

Title: ${video.title}
Channel: ${video.channel_name}
Category: ${video.category}
${isTranscript ? 'TRANSCRIPT' : 'VIDEO DESCRIPTION'}:
${content.slice(0, 15000)}

---

# PHASE 1: CONTENT EXTRACTION

## MAIN THESIS

What is the speaker's central argument or prediction? Explain this in two full paragraphs. The first paragraph should state the thesis clearly — what the speaker believes is happening or going to happen, and the core reasoning behind it. The second paragraph should explain WHY the speaker holds this view — what evidence, experience, or worldview drives their conviction. Include any framing language the speaker uses to position their argument. The goal is that someone reading this section understands the full thesis as well as if they heard the speaker explain it themselves.

## KEY NARRATIVES

What are the 3-5 major narratives or themes the speaker builds their argument around? For each narrative, write 2-3 paragraphs that explain:
- What the narrative is and how the speaker frames it
- The logic chain — what causes what, and how does this narrative connect to the main thesis?
- What evidence or examples the speaker provides to support this narrative
- How this narrative interacts with or reinforces the other narratives

These should read like mini-essays, not bullet points.

## SUPPORTING POINTS

List the 8-20 most important supporting arguments, insights, or claims the speaker makes. For each point:
- State the point clearly in one sentence
- Follow with 1-2 sentences of context explaining why the speaker raised it, how it connects to the broader thesis, and any nuance or caveats they added

Flag which points are the strongest pillars of the argument versus secondary observations. Order them by importance to the overall thesis.

## DATA POINTS & SPECIFIC CLAIMS

Extract every specific number, statistic, date, price, percentage, name, company, historical reference, or verifiable factual claim the speaker makes. Present these as a clean list. If the speaker attributes data to a specific source, note that source.

## ACTIONABLE IDEAS & RECOMMENDATIONS

What specific actions, trades, investments, strategies, or decisions does the speaker recommend or imply? For each, note the timeframe (if given), the reasoning behind it, and any conditions or caveats. If the speaker names specific tickers, assets, sectors, or strategies, list them explicitly.

---

# PHASE 2: CRITICAL ANALYSIS

Step outside the speaker's framing entirely. Be the skeptical analyst in the room.

## FACT CHECK

Take the most important data points and specific claims from Phase 1 and evaluate them. Rate each:
- **VERIFIED** — confirmed by credible sources within your knowledge
- **PARTIALLY TRUE** — directionally correct but specific numbers or framing may be misleading
- **UNVERIFIED** — cannot confirm, or claim is too vague to check
- **FALSE** — contradicted by credible evidence

For any claim rated less than VERIFIED, explain what the actual data shows. Note: this fact check is based on training data, not real-time search. Flag any claims that would require real-time data to verify.

## STRONGEST ARGUMENTS

Which 2-3 arguments from this video are most compelling? Why?

## WEAKEST ARGUMENTS

Which 2-3 arguments are the weakest, most speculative, or most likely to age poorly? What would need to be true for these arguments to hold?

## OVERALL ASSESSMENT

One paragraph. How credible is this analysis overall? What is the speaker's track record? What biases should the viewer be aware of? Would you recommend this video to a serious investor?

---

RULES:
- Only analyze what is ACTUALLY in the provided content. Never fabricate claims, data, or quotes.
- ${isTranscript ? 'You have the full transcript — provide a thorough, comprehensive analysis.' : 'Working from description only — note that transcript was unavailable and keep analysis proportional to available content.'}
- Be analytical and objective. If the speaker makes weak arguments, say so clearly.
- Use direct quotes from the transcript where possible to support your analysis.`,
      }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';
    await db.from('intel_youtube_videos').update({ full_summary: summary }).eq('video_id', video_id);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
