import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST: parse natural language search into Apollo filters
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `You parse natural language prospect search queries into structured Apollo API filters.

Given a search query like "Find 100 CTOs at Series B fintech startups in the US with 20-200 employees", extract:
- person_titles: job title keywords (array of strings)
- organization_industries: industry names (array of strings)
- organization_num_employees_ranges: size buckets like "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+" (array of strings)
- organization_funding_stage: e.g. "Seed", "Series A", "Series B", "Series C", "Public" (array of strings)
- person_locations: countries, states, or cities (array of strings)
- q_keywords: any other keywords or buying intent signals (string)
- per_page: number of results requested, default 25 (number)

Return ONLY a JSON object with these fields. Omit fields that aren't mentioned in the query. Do not include markdown or explanation.`,
      messages: [{
        role: 'user',
        content: query.trim(),
      }],
    });

    const text = message.content?.[0]?.type === 'text' ? message.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      const filters = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      return NextResponse.json({ filters });
    } catch {
      return NextResponse.json({ filters: {}, raw: text });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to parse query';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
