import Anthropic from '@anthropic-ai/sdk';
import type { SignalType } from '@/types/robox-intel';

/**
 * LLM-powered enhancement of signal summaries and suggested actions.
 *
 * Falls back to template-based output if:
 *   - ANTHROPIC_API_KEY is not set
 *   - API call fails
 *   - Response can't be parsed
 */

const ROBOX_CONTEXT = `RoboX is a startup that provides training data for
robotics and physical AI models. We collect egocentric video, manipulation
demonstrations, and task-specific data at scale via a distributed workforce
using smartphones and lightweight recording kits. Our buyers are:
- Humanoid robotics companies (Figure AI, Skild AI, Apptronik, Agility)
- Physical AI labs (Physical Intelligence, Google DeepMind Robotics, Toyota)
- Academic robot learning labs (Stanford IRIS, Berkeley BAIR, CMU RI, etc.)

A good outreach hook identifies a fresh, specific reason to reach out:
they just raised, they posted a relevant role, they published a paper
citing data gaps, they filed a grant for robot training, they announced
a new product that requires scaling data collection.

Competitors include Scale AI, Sensei (YC S24), Cortex AI, Micro1,
Objectways, Labellerr, Appen. Avoid recommending approaches that
sound like generic data labelling — lead with the specific physical/
embodied data need.`;

interface EnhanceInput {
  type: SignalType;
  title: string;
  company: string;
  source: string;
  date: string;
  rawContent: string;
}

interface EnhanceOutput {
  summary: string;
  suggestedAction: string;
}

let clientSingleton: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (clientSingleton) return clientSingleton;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  clientSingleton = new Anthropic({ apiKey });
  return clientSingleton;
}

/**
 * Ask Claude to write a concise 2-3 sentence summary and a concrete,
 * specific suggested action for this signal.
 */
export async function enhanceSignal(
  input: EnhanceInput
): Promise<EnhanceOutput | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `You are an intelligence analyst for RoboX. Given a signal below,
produce:
1. SUMMARY: 2-3 sentences stating the facts that matter for outreach.
   Include dollar amounts, roles, dataset names, and quoted claims when
   present. Do NOT pad or speculate.
2. ACTION: One paragraph (2-4 sentences) giving a specific outreach
   recommendation. Name who to contact if obvious from the content (role,
   team). State the hook. Flag any RoboX-specific angle.

Signal type: ${input.type}
Company: ${input.company}
Source: ${input.source}
Date: ${input.date}
Title: ${input.title}

Raw content:
${input.rawContent.slice(0, 4000)}

Respond in this exact JSON format (no prose before or after):
{"summary": "...", "action": "..."}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: ROBOX_CONTEXT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    // Strip code fences if the model added them
    const raw = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    const parsed = JSON.parse(raw) as { summary: string; action: string };
    if (!parsed.summary || !parsed.action) return null;

    return {
      summary: parsed.summary,
      suggestedAction: parsed.action,
    };
  } catch (err) {
    console.error('[llm] enhance failed:', err);
    return null;
  }
}

/**
 * True when the LLM is configured and available.
 */
export function isLLMEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
