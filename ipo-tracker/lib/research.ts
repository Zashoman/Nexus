import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-7";

export interface ResearchResult {
  website_url: string | null;
  description: string | null;
  revenue_usd: number | null;
  net_income_usd: number | null;
  pe_ratio: number | null;
}

const RESEARCH_SYSTEM = `You are an IPO research analyst. Given a company name and ticker, use the web_search tool to gather authoritative information, then return structured JSON.

Sources to prefer (in this order):
1. The S-1 / F-1 / 424B prospectus on sec.gov — most reliable for financials.
2. The company's official corporate website.
3. Reuters, Bloomberg, IPO Scoop, Renaissance Capital, MarketWatch.
4. Reputable financial news outlets covering the deal.

What to extract:

- website_url: The company's primary corporate website (https://...). Not a press release, not a SEC filing page, not a stock-tracker page. If you cannot find it confidently, return null.

- description: A clear plain-English description in exactly two paragraphs separated by a blank line.
  - Paragraph 1: What the company does, who their customers are, what makes them distinctive in the market.
  - Paragraph 2: Stage of the business (revenue/profitability), key milestones, IPO context (use of proceeds if disclosed).
  - Total length 100-220 words. No marketing fluff. No "leading provider of" cliches.

- revenue_usd: Most recently reported trailing-twelve-month (TTM) revenue, in raw USD (an integer like 50000000, not 50). For pre-revenue companies, return null. Do not fabricate.

- net_income_usd: Most recent TTM net income in raw USD (negative integer for net losses). null if unknown.

- pe_ratio: Approximate price-to-earnings ratio at the IPO offer price (use mid of price range when applicable). Calculate as (offer_price * shares_outstanding_post_ipo) / net_income. Most pre-IPO companies are unprofitable; if net income is negative or zero, return null. Do not fabricate a P/E.

Rules:
- Return null for any field you cannot verify from a credible source. Do not hallucinate or guess.
- All numeric fields must be raw dollars or unitless ratios — never strings, never units like "$50M" or "50 million".
- Output valid JSON only matching this exact shape, no prose, no markdown fences:
  {"website_url": <string|null>, "description": <string|null>, "revenue_usd": <number|null>, "net_income_usd": <number|null>, "pe_ratio": <number|null>}`;

const EMPTY: ResearchResult = {
  website_url: null,
  description: null,
  revenue_usd: null,
  net_income_usd: null,
  pe_ratio: null,
};

export async function researchCompany(
  ticker: string,
  companyName: string,
): Promise<ResearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });

  const userPrompt = `Research the IPO of ${companyName} (ticker: ${ticker}). Find their corporate website, write a 2-paragraph plain-English description, and extract their most recent annual revenue, net income, and P/E ratio at the IPO offer price. Use web_search to consult primary sources. Return JSON only — no prose, no fences.`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: RESEARCH_SYSTEM,
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 5,
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return parseResearch(raw);
}

export function parseResearch(raw: string): ResearchResult {
  if (!raw) return EMPTY;
  // Strip code fences just in case the model adds them despite the schema.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return EMPTY;
    }
  }

  const obj = parsed as Partial<{
    website_url: unknown;
    description: unknown;
    revenue_usd: unknown;
    net_income_usd: unknown;
    pe_ratio: unknown;
  }>;

  return {
    website_url: pickUrl(obj.website_url),
    description: pickString(obj.description),
    revenue_usd: pickInt(obj.revenue_usd),
    net_income_usd: pickInt(obj.net_income_usd),
    pe_ratio: pickNumber(obj.pe_ratio),
  };
}

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function pickUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

function pickNumber(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pickInt(v: unknown): number | null {
  const n = pickNumber(v);
  return n === null ? null : Math.round(n);
}
