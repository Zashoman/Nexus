import Anthropic from "@anthropic-ai/sdk";
import type { IpoDraft } from "../types";

const MODEL = "claude-opus-4-7";

const SYSTEM = `You are an Asian IPO research analyst. Use the web_search tool to find IPOs in the next 14 days across Asian exchanges, then return structured JSON.

Exchanges to cover (in priority order):
1. HKEX (Hong Kong Stock Exchange) — primary, most accessible to global investors
2. TSE / TYO (Tokyo Stock Exchange) — Japan
3. SSE / SZSE (Shanghai / Shenzhen) — Mainland China
4. KOSPI / KOSDAQ — South Korea
5. SGX — Singapore
6. TWSE — Taiwan

Search strategy:
- Start with: "HKEX upcoming IPO this week", "HKEX new listing calendar", "Hong Kong IPO 2026 [month]"
- Cross-reference: HKEX's own listing-activity pages, Reuters / Bloomberg Asia IPO coverage, Nikkei Asia IPO news, SCMP IPO news
- For mainland China: "Shanghai IPO calendar [month]", "STAR market IPO", "Shenzhen ChiNext IPO"
- For Japan: "TSE IPO [month] 2026", "Japan Tokyo IPO calendar"
- Focus on IPOs filing or pricing in the next 14 days. Only include deals you can confirm from a credible source.

For each IPO, return an object with these EXACT fields:

- ticker: Local ticker formatted as exchange-native. HKEX: 4-digit padded with ".HK" suffix (e.g. "1879.HK", "2493.HK"). TSE: 4-digit number (e.g. "7203"). SSE: 6-digit (e.g. "688981"). KOSPI: 6-digit. SGX: short code. Always uppercase.
- company_name: Full company name in English (translate if needed).
- exchange: One of HKEX, TSE, SSE, SZSE, KOSPI, KOSDAQ, SGX, TWSE.
- stage: "filed" (just submitted prospectus / preliminary) or "priced" (pricing announced / confirmed).
- deal_size_usd: Approximate USD raise (integer dollars, e.g. 323000000). null if unknown.
- price_low / price_high: Local-currency offer price range as numbers (e.g. 166.60). null if unknown.
- shares_offered: Integer share count if known, null otherwise.
- expected_date: YYYY-MM-DD ISO date if known, null otherwise.
- business_description: One short paragraph (40-80 words) describing what the company does. This will be used by a downstream classifier and a research step.
- source_url: Best link — preferably the HKEX listing announcement, Reuters article, or company prospectus. Must start with https://. null if you don't have a confident URL.

Output JSON ONLY in this exact shape (no prose, no fences, no commentary):
{"ipos": [<object>, <object>, ...]}

If no IPOs are confirmed in the window, return {"ipos": []}.

Rules:
- NEVER fabricate. If you cannot verify an IPO from a credible source, omit it.
- Cap output at 25 IPOs total to keep the response manageable.
- Numeric fields must be raw numbers — never strings, never units like "$50M".`;

interface AsianResponse {
  ipos: Array<Partial<IpoDraft> & { exchange?: string }>;
}

export interface FetchResult {
  items: IpoDraft[];
  error: string | null;
}

export async function fetchAsianIpos(): Promise<FetchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { items: [], error: "Missing ANTHROPIC_API_KEY" };

  const client = new Anthropic({ apiKey });

  let raw: string;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 8,
        },
      ],
      messages: [
        {
          role: "user",
          content:
            "Find all upcoming or recently-filed IPOs on Asian exchanges (HKEX, TSE, SSE, SZSE, KOSPI, KOSDAQ, SGX, TWSE) for the next 14 days. Return JSON only.",
        },
      ],
    });

    raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (err) {
    return { items: [], error: (err as Error).message };
  }

  return parseAsianIpos(raw);
}

export function parseAsianIpos(raw: string): FetchResult {
  if (!raw) return { items: [], error: "empty response" };

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: AsianResponse;
  try {
    parsed = JSON.parse(cleaned) as AsianResponse;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return { items: [], error: "no JSON in response" };
    try {
      parsed = JSON.parse(match[0]) as AsianResponse;
    } catch {
      return { items: [], error: "invalid JSON" };
    }
  }

  const rows = Array.isArray(parsed.ipos) ? parsed.ipos : [];
  const items: IpoDraft[] = [];

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const ticker = pickStr(r.ticker)?.toUpperCase();
    const company = pickStr(r.company_name);
    if (!ticker || !company) continue;

    const stage = r.stage === "priced" ? "priced" : "filed";

    items.push({
      ticker,
      company_name: company,
      exchange: pickStr(r.exchange),
      stage,
      deal_size_usd: pickInt(r.deal_size_usd),
      price_low: pickNum(r.price_low),
      price_high: pickNum(r.price_high),
      shares_offered: pickInt(r.shares_offered),
      expected_date: pickIsoDate(r.expected_date),
      business_description: pickStr(r.business_description),
      source: "asian",
      source_url: pickUrl(r.source_url),
    });
  }

  return { items, error: null };
}

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function pickNum(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pickInt(v: unknown): number | null {
  const n = pickNum(v);
  return n === null ? null : Math.round(n);
}

function pickUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || !/^https?:\/\//i.test(s)) return null;
  return s;
}

function pickIsoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}
