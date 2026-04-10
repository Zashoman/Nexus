// ============================================================
// Email Reply Classifier — uses Claude to categorize replies
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

export type ReplyCategory =
  | 'interested'
  | 'meeting_request'
  | 'question'
  | 'not_now_later'
  | 'not_interested'
  | 'out_of_office'
  | 'auto_reply'
  | 'wrong_person'
  | 'unsubscribe';

export interface ClassificationResult {
  category: ReplyCategory;
  confidence: number;
  summary: string;
  needs_reply: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
}

const CLASSIFICATION_PROMPT = `You are an email reply classifier for a B2B outreach team. Given an email reply, classify it into exactly one category and provide a brief summary.

Categories:
- "interested": The person expressed interest, wants more info, asked to learn more, or said positive things about the offer.
- "meeting_request": The person wants to schedule a call or meeting.
- "question": The person asked a question about services, pricing, process, or the company.
- "not_now_later": The person said not right now but maybe later, or asked to follow up in the future.
- "not_interested": The person declined, said no thanks, or expressed disinterest.
- "out_of_office": Auto-generated out of office / vacation reply.
- "auto_reply": Automated response (delivery notification, system message, etc).
- "wrong_person": The person said they're not the right contact or forwarded to someone else.
- "unsubscribe": The person asked to stop receiving emails or be removed from the list.

For each reply, respond with ONLY a JSON object (no markdown, no explanation):
{
  "category": "<category>",
  "confidence": <0.0-1.0>,
  "summary": "<one sentence summary of what the person said>",
  "needs_reply": <true/false>,
  "priority": "<high/medium/low/none>"
}

Priority rules:
- high: interested, meeting_request
- medium: question, not_now_later, wrong_person
- low: not_interested, unsubscribe
- none: out_of_office, auto_reply`;

export async function classifyReply(
  senderName: string,
  senderEmail: string,
  subject: string,
  body: string,
  campaignContext?: string,
): Promise<ClassificationResult> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: CLASSIFICATION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `From: ${senderName} <${senderEmail}>
Subject: ${subject}
${campaignContext ? `Campaign context: ${campaignContext}\n` : ''}
Email body:
${body.substring(0, 2000)}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const result = JSON.parse(text);
    return {
      category: result.category || 'auto_reply',
      confidence: result.confidence || 0.5,
      summary: result.summary || '',
      needs_reply: result.needs_reply ?? false,
      priority: result.priority || 'none',
    };
  } catch {
    // If Claude's response isn't valid JSON, fall back
    return {
      category: 'auto_reply',
      confidence: 0.3,
      summary: 'Could not classify this reply',
      needs_reply: false,
      priority: 'none',
    };
  }
}

/** Classify multiple replies in batch */
export async function classifyReplies(
  replies: Array<{
    id: string;
    senderName: string;
    senderEmail: string;
    subject: string;
    body: string;
    campaignContext?: string;
  }>,
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  // Process in parallel, max 5 at a time
  const batchSize = 5;
  for (let i = 0; i < replies.length; i += batchSize) {
    const batch = replies.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (reply) => {
        try {
          const result = await classifyReply(
            reply.senderName,
            reply.senderEmail,
            reply.subject,
            reply.body,
            reply.campaignContext,
          );
          return { id: reply.id, result };
        } catch {
          return {
            id: reply.id,
            result: {
              category: 'auto_reply' as ReplyCategory,
              confidence: 0,
              summary: 'Classification failed',
              needs_reply: false,
              priority: 'none' as const,
            },
          };
        }
      }),
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}
