import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST: analyze a person and generate lookalike search filters
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'query is required (LinkedIn URL, email, or name + company)' }, { status: 400 });
    }

    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `You analyze a person or company description and generate Apollo search filters to find similar people.

Given a description like "Sarah Chen, CTO at Finova Capital, Series B fintech, 150 employees, San Francisco" or a LinkedIn URL, extract the key attributes and generate search filters to find lookalikes.

Return ONLY a JSON object:
{
  "person_titles": ["CTO", "VP Engineering"],
  "organization_industries": ["Fintech"],
  "organization_num_employees_ranges": ["51-200"],
  "organization_funding_stage": ["Series B"],
  "person_locations": ["San Francisco"],
  "reasoning": "One sentence explaining the lookalike logic"
}

If given a LinkedIn URL, infer what you can from the URL structure. If given an email, infer company from the domain. Generate the closest possible filters.`,
      messages: [{
        role: 'user',
        content: `Find people similar to: ${query}`,
      }],
    });

    const text = message.content?.[0]?.type === 'text' ? message.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      const filters = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      return NextResponse.json({ filters, reasoning: filters.reasoning || '' });
    } catch {
      return NextResponse.json({ filters: {}, reasoning: 'Could not parse lookalike attributes' });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
