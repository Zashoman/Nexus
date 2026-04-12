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

// Pre-filter: catch obvious auto-replies without spending tokens
const AUTO_REPLY_PATTERNS = [
  /no longer monitor/i,
  /not monitored/i,
  /mailbox is full/i,
  /undeliverable/i,
  /delivery has failed/i,
  /delivery failed/i,
  /address not found/i,
  /mail delivery failed/i,
  /message not delivered/i,
  /auto(?:matic|mated)?[-\s]?repl/i,
  /out of (?:the )?office/i,
  /i am out of office/i,
  /i'?m currently out/i,
  /on (?:annual |vacation |holiday )?leave/i,
  /will be (?:out|away|unavailable)/i,
  /returning (?:on|to the office)/i,
  /automatische antwort/i, // German
  /respuesta automática/i, // Spanish
  /réponse automatique/i, // French
  /risposta automatica/i, // Italian
  /please contact .* instead/i,
  /please (?:use|email|reach out to|send to) .* instead/i,
  /this mailbox is not/i,
  /this email is not/i,
  /this account is not/i,
  /no reply/i,
  /do not reply/i,
  /donotreply/i,
];

const OOO_PATTERNS = [
  /out of (?:the )?office/i,
  /on (?:annual |vacation |holiday )?leave/i,
  /on (?:vacation|holiday)/i,
  /currently (?:away|out)/i,
  /will return/i,
  /will be back/i,
  /returning on/i,
  /automatische antwort/i,
];

function preClassify(subject: string, body: string): ClassificationResult | null {
  const combined = `${subject} ${body}`.toLowerCase();

  // Check for OOO specifically first
  if (OOO_PATTERNS.some((p) => p.test(combined))) {
    return {
      category: 'out_of_office',
      confidence: 0.95,
      summary: 'Out of office auto-reply',
      needs_reply: false,
      priority: 'none',
    };
  }

  // Check for other auto-replies
  if (AUTO_REPLY_PATTERNS.some((p) => p.test(combined))) {
    return {
      category: 'auto_reply',
      confidence: 0.95,
      summary: 'Automated reply — no response needed',
      needs_reply: false,
      priority: 'none',
    };
  }

  return null;
}

const CLASSIFICATION_PROMPT = `You are an email reply classifier for a B2B outreach team. Classify each reply and provide a brief summary.

Categories:
- "interested": The person expressed interest, wants more info, asked to learn more, or said positive things about the offer.
- "meeting_request": The person wants to schedule a call or meeting.
- "question": The person asked a specific question about services, pricing, process, or the company.
- "not_now_later": The person said not right now but maybe later, or asked to follow up in the future.
- "not_interested": The person declined, said no thanks, or expressed disinterest.
- "out_of_office": Auto-generated out of office / vacation / away reply. Any mention of being "out of office", "on vacation", "will return", etc.
- "auto_reply": Any automated response including: mailbox no longer monitored, delivery failed, do-not-reply, system messages, automated notifications.
- "wrong_person": The person said they're not the right contact or forwarded to someone else.
- "unsubscribe": The person asked to stop receiving emails.

IMPORTANT:
- Mailbox auto-reply messages (e.g., "this mailbox is no longer monitored", "this email is not actively monitored") should ALWAYS be classified as "auto_reply" with needs_reply: false.
- Out of office messages should be "out_of_office" with needs_reply: false.
- Only classify as "interested" if the person ACTIVELY engaged with the message and wrote something meaningful.
- Short replies like "Could you share more info?" are legitimate interested replies if they're not automated.

Respond with ONLY a JSON object (no markdown):
{
  "category": "<category>",
  "confidence": <0.0-1.0>,
  "summary": "<one sentence summary>",
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
  // Pre-filter for obvious auto-replies (saves tokens, faster)
  const preResult = preClassify(subject, body);
  if (preResult) return preResult;

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
${campaignContext ? `Campaign: ${campaignContext}\n` : ''}
Email body:
${body.substring(0, 2000)}`,
      },
    ],
  });

  const text = message.content?.[0]?.type === 'text' ? message.content[0].text : '';

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
