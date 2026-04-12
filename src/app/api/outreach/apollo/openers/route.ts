import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ApolloPerson } from '@/lib/outreach/apollo';

interface OpenerResult {
  person_id: string;
  subject: string;
  opener: string;
}

// POST: generate personalized openers for a list of prospects
export async function POST(request: Request) {
  try {
    const { prospects, campaign_context } = await request.json() as {
      prospects: ApolloPerson[];
      campaign_context?: string;
    };

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'prospects array required' }, { status: 400 });
    }

    if (prospects.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 prospects per request' }, { status: 400 });
    }

    const client = new Anthropic();
    const results: OpenerResult[] = [];

    // Process in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (p) => {
          try {
            const company = p.organization?.name || 'their company';
            const title = p.title || 'their role';
            const industry = p.organization?.industry || '';
            const description = p.organization?.short_description || '';

            const message = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 512,
              system: `You are writing personalized cold email openers for Blue Tree Digital PR.

Blue Tree helps SaaS/tech companies grow through:
- Editorial placements in major publications (TechCrunch, Wired, HBR, ComputerWeekly)
- High-quality backlinks that boost organic search and AI search visibility
- Digital PR campaigns — they helped Hostinger achieve 211%+ organic growth

Write a concise cold email opener (NOT the full email) that:
- Opens with a specific, relevant observation about THEIR company/role/industry
- Bridges to a relevant Blue Tree value prop
- Asks a soft question to invite a reply
- 3-4 sentences max
- Sounds human, not template-y
- Does NOT use generic phrases like "I hope this email finds you well"
- Includes a custom subject line that's specific and intriguing

Output format (strict JSON):
{
  "subject": "<subject line>",
  "opener": "<email opener body>"
}

${campaign_context ? `\nCampaign context: ${campaign_context}` : ''}`,
              messages: [{
                role: 'user',
                content: `Write an opener for:

Name: ${p.first_name} ${p.last_name}
Title: ${title}
Company: ${company}
Industry: ${industry}
${description ? `About: ${description}` : ''}
${p.organization?.estimated_num_employees ? `Size: ${p.organization.estimated_num_employees} employees` : ''}

Output only JSON, no markdown.`,
              }],
            });

            const text = message.content?.[0]?.type === 'text' ? message.content[0].text : '';
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            let parsed = { subject: '', opener: '' };
            try {
              if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            } catch { /* fallback to empty */ }

            return {
              person_id: p.id,
              subject: parsed.subject || '',
              opener: parsed.opener || '',
            };
          } catch (err) {
            console.error('Opener generation failed for', p.id, err);
            return {
              person_id: p.id,
              subject: '',
              opener: '(Generation failed)',
            };
          }
        })
      );

      results.push(...batchResults);
    }

    return NextResponse.json({ openers: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
