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
  const { video_id, mode } = await req.json() as { video_id: string; mode: 'mini' | 'full' | 'extended' | 'factcheck' };

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

  // Check cached extended/factcheck in metadata JSON column
  const metadata = video.metadata || {};
  if (mode === 'extended' && metadata.extended_summary) {
    return NextResponse.json({ summary: metadata.extended_summary });
  }
  if (mode === 'factcheck' && metadata.factcheck) {
    return NextResponse.json({ summary: metadata.factcheck });
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

  // Extended mode — deep 3x longer breakdown
  if (mode === 'extended') {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: `You are analyzing a video. Below is the transcript/content. Follow the instructions precisely.

Title: ${video.title}
Channel: ${video.channel_name}
Category: ${video.category}
${isTranscript ? 'TRANSCRIPT' : 'VIDEO DESCRIPTION'}:
${content.slice(0, 30000)}

---

PHASE 1: CONTENT EXTRACTION
Your goal in this phase is to reconstruct the speaker's argument so completely that someone who reads your analysis could hold a conversation about this video without having watched it. Do not editorialize in this phase. Do not insert your own views, caveats, or corrections. Your job here is to be a perfect mirror -- represent the speaker's argument as they intended it, in full depth, with all its internal logic intact. Save your critical lens for Phase 2.

## MAIN THESIS
What is the speaker's central argument or prediction? Explain this in two full paragraphs.
The first paragraph should state the thesis clearly -- what the speaker believes is happening or going to happen, and the core reasoning behind it. Be precise about scope: is this a near-term tactical call, a multi-year macro shift, or a generational structural change? Does the speaker frame this as a high-conviction prediction, a probabilistic scenario, or an emerging risk most people are underweighting? Capture the exact nature of the claim. If the speaker is making a market call, what direction, what magnitude, what timeframe? If they're describing a geopolitical shift, what is the before state and what is the after state they envision? If they're arguing about policy or economics, what is the mechanism they believe is driving change? Don't soften or hedge what the speaker actually said -- if they made a bold claim, represent it as a bold claim.
The second paragraph should explain WHY the speaker holds this view -- what evidence, experience, or worldview drives their conviction. This is about the intellectual foundation under the thesis. What mental models is the speaker operating from? Are they reasoning from historical analogy, first principles, data patterns, insider knowledge, or ideological priors? Include any framing language the speaker uses to position their argument. If the speaker positions themselves against a mainstream view, capture what they believe the mainstream gets wrong and why. If they claim special authority or insight, note that too.

## KEY NARRATIVES
What are the 3-5 major narratives or themes the speaker builds their argument around? These are the load-bearing pillars of the argument -- the big ideas that, if you removed any one of them, the thesis would substantially weaken.
For each narrative, write 2-3 paragraphs that explain:
- What the narrative is and how the speaker frames it -- including the language, metaphors, and analogies they use. If they name-drop a framework, explain what that framework means and how they're applying it.
- The logic chain -- what causes what, and how does this narrative connect to the main thesis? Spell out the causal reasoning step by step.
- What evidence or examples the speaker provides to support this narrative -- including specific data points, historical analogies, case studies, charts they reference, or anecdotes they tell.
- How this narrative interacts with or reinforces the other narratives.
These should read like mini-essays, not bullet points.

## SUPPORTING POINTS
List the 8-20 most important supporting arguments, insights, or claims. For each point:
- State the point clearly in one sentence. Be precise and specific.
- Follow with 1-2 sentences of context explaining why the speaker raised it, how it connects to the broader thesis, and any nuance or caveats they added.
- Tag each as [CORE], [SUPPORTING], or [TANGENTIAL].
Order by importance to the overall thesis.

## DATA POINTS & SPECIFIC CLAIMS
Extract every specific number, statistic, date, price, percentage, name, company, historical reference, or verifiable factual claim. Present as a clean list grouped by category. For each include:
- The exact claim as the speaker stated it
- The context in which it was used
- If attributed to a specific source, note that source
- If approximate or hedged, flag that imprecision

## ACTIONABLE IDEAS & RECOMMENDATIONS
What specific actions, trades, investments, strategies, or decisions does the speaker recommend or imply? For each:
- State the specific action clearly
- Note the timeframe if given
- Explain the reasoning behind it
- Capture any conditions, triggers, or caveats
- Note the conviction level
- If the speaker names specific tickers, assets, sectors, commodities, or geographies, list them explicitly
Separate concrete recommendations from vague directional suggestions. Also capture anti-recommendations (what NOT to do).

PHASE 2: CRITICAL ANALYSIS

## FACT CHECK
Take the data points from Phase 1 and verify the most important ones. Rate each as:
- VERIFIED -- confirmed by credible sources
- PARTIALLY TRUE -- directionally correct but numbers/framing are misleading or missing context
- UNVERIFIED -- cannot find supporting evidence
- FALSE -- directly contradicted by credible evidence
For any claim rated less than VERIFIED, explain what the actual data shows. Focus on claims that are load-bearing for the thesis.

## LOGICAL INTEGRITY
Evaluate the internal logic. Identify: causal leaps, unfalsifiable claims, selection bias in evidence, conflation of correlation and causation, timeframe ambiguity, scope creep. Rate overall logical integrity as STRONG, MODERATE, or WEAK and explain in 2-3 sentences.

## WHAT'S MISSING
Identify the 3-5 most important things the speaker didn't address that would materially change the analysis. For each, explain what it is, why it matters, and how it would change the argument.

## SPEAKER CONTEXT & POTENTIAL BIAS
Assess professional incentives, track record, and epistemic style in 1-2 paragraphs.

## BOTTOM LINE
In 3-5 sentences, give your honest overall assessment. How much should the reader take seriously? What is strongest? What is weakest? What would you tell someone about to act on this?

---
RULES:
- Only analyze what is ACTUALLY in the content. Never fabricate.
- ${isTranscript ? 'Full transcript available -- be exhaustive.' : 'Working from description only -- note this and keep proportional.'}
- Use direct quotes where they strengthen the analysis.
- Be analytical and objective. Call out weak arguments clearly.
- Do not pad or use filler. Every sentence should carry information.`,
        }],
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text : '';
      // Cache in metadata
      await db.from('intel_youtube_videos').update({
        metadata: { ...metadata, extended_summary: summary },
      }).eq('video_id', video_id);
      return NextResponse.json({ summary });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
    }
  }

  // Full summary mode (original ~850 word analysis)
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
