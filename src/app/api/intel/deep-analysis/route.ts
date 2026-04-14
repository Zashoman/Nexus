import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const maxDuration = 120;

async function fetchFullArticle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return '';

    const html = await res.text();

    // Extract article content from common patterns
    // Remove scripts, styles, nav, footer
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '');

    // Try to find article body
    const articleMatch = text.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) {
      text = articleMatch[0];
    }

    // Strip remaining HTML tags
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Only return if we got meaningful content (more than just nav/header text)
    if (text.length > 500) return text.slice(0, 8000);
    return '';
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { item_id } = await req.json();

  if (!item_id) {
    return NextResponse.json({ error: 'item_id required' }, { status: 400 });
  }

  const db = getServiceSupabase();

  const { data: item, error } = await db
    .from('intel_items')
    .select('*')
    .eq('id', item_id)
    .single();

  if (error || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Check if deep analysis already exists in metadata
  const meta = (item.metadata || {}) as Record<string, unknown>;
  if (meta.deep_analysis) {
    return NextResponse.json({ analysis: meta.deep_analysis as string });
  }

  // Try to get full article content
  let content = '';
  let contentSource = 'rss_snippet';

  // Method 1: Try fetching the full article page
  if (item.original_url) {
    const fullArticle = await fetchFullArticle(item.original_url);
    if (fullArticle.length > 500) {
      content = fullArticle;
      contentSource = 'full_article';
    }
  }

  // Method 2: Fall back to RSS content + AI summary
  if (!content || content.length < 500) {
    const parts: string[] = [];
    if (item.ai_summary) parts.push(item.ai_summary);
    if (item.summary) parts.push(item.summary);
    if (item.raw_content) parts.push(item.raw_content);
    content = parts.join('\n\n');
    contentSource = 'rss_content';
  }

  if (content.length < 50) {
    return NextResponse.json({
      analysis: `Insufficient content available for deep analysis of "${item.title}". Open the original source to read the full article.`
    });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are a senior intelligence analyst producing a deep-dive breakdown of the following article. Your output should be approximately 750 words, structured exactly as follows:

## 1. CORE THESIS (2-3 sentences)
State the article's central argument or claim in plain language. What is the author ultimately trying to say? Strip away rhetoric and reduce it to the raw thesis.

## 2. KEY SUB-POINTS (5 points)
List the 5 most important supporting arguments or claims the author makes to build their case. For each, write 1-2 sentences explaining the point AND how it connects to the core thesis. Label each as:
- [FACTUAL] - based on verifiable data or events
- [INTERPRETIVE] - the author's analysis or opinion presented as reasoning
- [SPECULATIVE] - forward-looking claims or predictions without hard evidence

## 3. DATA POINTS & EVIDENCE (up to 10 items)
Extract every specific, verifiable data point from the article - numbers, dates, statistics, named sources, quoted figures, study citations, official statements. For each, note:
- The data point itself
- The original source cited (or "unsourced" if the author provides no attribution)
- [VERIFIED / UNVERIFIED / MISLEADING] - flag if the data point is presented accurately, lacks sourcing, or appears to be cherry-picked or stripped of context

## 4. WRITER ANALYSIS

### Factual Accuracy (rate 1-10)
How well does the article stick to verifiable facts? Deduct points for unsourced claims presented as fact, missing context that changes the meaning of data, or selective use of statistics. Explain your rating in 2-3 sentences.

### Political & Ideological Lean
Identify the author's apparent perspective. Do not use simplistic "left/right" labels. Instead describe the specific worldview: pro-regulation, free-market, techno-optimist, national security hawk, fiscal conservative, progressive interventionist, etc. Cite 2-3 specific word choices, framings, or omissions that reveal this lean. If the article is genuinely neutral, say so and explain why.

### Rhetorical Techniques
Identify any persuasion tactics used: appeal to authority, appeal to fear, false dichotomy, strawman arguments, anchoring with extreme numbers, burying counter-evidence, loaded language, unnamed sources used to make strong claims. List each technique with the specific example from the text.

### What's Missing
What does this article NOT say that a fully honest treatment of the topic would include? What counter-arguments, data points, or perspectives did the author omit?

## 5. BOTTOM LINE (2-3 sentences)
If I only had 30 seconds, what should I take away from this article? Is the core thesis sound? How much should I trust this piece: RELIABLE SOURCE / USE WITH CAUTION / VERIFY INDEPENDENTLY / DISREGARD.

---

IMPORTANT RULES:
- Do NOT summarize the article generically. Extract specific claims and data.
- Do NOT hedge excessively. Take a position on accuracy and lean.
- If the article is well-written and factually sound, say so.
- If the article is propaganda or poorly sourced, say so directly.
- Write in a direct, analytical tone. No filler.
- ${contentSource === 'full_article' ? 'You have the full article text.' : 'Working from a partial excerpt (RSS snippet). Note this limitation but still provide the best analysis possible from available content.'}

ARTICLE:
Title: ${item.title}
Source: ${item.source_name} (Tier ${item.source_tier})
URL: ${item.original_url}
Content:
${content.slice(0, 8000)}`,
      }],
    });

    const analysis = response.content[0].type === 'text' ? response.content[0].text : '';

    // Cache the analysis in metadata
    await db
      .from('intel_items')
      .update({
        metadata: { ...meta, deep_analysis: analysis, deep_analysis_source: contentSource },
      })
      .eq('id', item_id);

    return NextResponse.json({ analysis, content_source: contentSource });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}
