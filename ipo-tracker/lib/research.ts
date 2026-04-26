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

Every IPO files a public S-1 / F-1 / 424B prospectus on sec.gov that contains:
- The company's website on the cover page
- A "Business" section describing what they do
- Audited financials (Revenue, Net Income / Loss)

Always start by searching for the SEC filing — searches like "<ticker> S-1 site:sec.gov" or "<company name> SEC prospectus" reliably find it. Then cross-reference with the company's website and financial press.

Sources to prefer (in order):
1. The S-1 / F-1 / 424B prospectus on sec.gov.
2. The company's official corporate website.
3. Reuters, Bloomberg, IPO Scoop, Renaissance Capital, MarketWatch.

Output a JSON object with these fields, with these EXACT requirements:

- website_url: The company's primary corporate website (must start with https://). Find this on the cover page of the S-1 / F-1, or via a direct web search. For obscure companies, search "<exact company name>" + "official website" or pull from SEC EDGAR. Never return null unless you have searched at least three times and still cannot find any company web presence.

- description: ALWAYS provide a non-empty description, even for obscure companies. NEVER return "...", "n/a", an empty string, or a single sentence placeholder. If the SEC filing is too dense, summarize the "Business" section in two paragraphs. Format requirements:
  - Exactly two paragraphs separated by a blank line.
  - Paragraph 1: What the company does, who their customers are, what makes them distinctive.
  - Paragraph 2: Stage of business (revenue / profitability), key milestones, IPO context (use of proceeds if disclosed).
  - 100-220 words total. Plain English. No marketing fluff.

- revenue_usd: Most recently reported trailing-twelve-month (TTM) revenue, in raw USD (an integer like 50000000, NOT 50). For pre-revenue companies, return null. For partnerships / SPACs / BDCs without standard revenue, return null.

- net_income_usd: Most recent TTM net income in raw USD (negative integer for net losses). null if unknown or not applicable to the entity type.

- pe_ratio: Approximate P/E at the IPO offer price (mid of price range). Calculate as (offer_price * shares_outstanding_post_ipo) / net_income. Return null if net income is negative, zero, or unavailable. Never fabricate.

Rules:
- Never hallucinate or guess. If you cannot verify a numeric field from a credible source, return null.
- All numeric fields are raw integers / numbers — never strings, never "$50M", never "50 million".
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
