import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function autoRefreshData(): Promise<{
  total_transactions: number | null;
  offplan_transactions: number | null;
  secondary_transactions: number | null;
  mortgage_registrations: number | null;
  cash_transactions: number | null;
  total_value_aed_billions: number | null;
  dfm_re_index: number | null;
  emaar_share_price: number | null;
  listing_inventory: number | null;
  data_date: string;
  sources: string[];
}> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 10,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Search for the latest Dubai real estate market data from the past 7 days. You MUST attempt all 6 searches below — do not stop early. Each search should target primary sources where possible.

SEARCH TARGETS:
1. "Dubai DLD weekly transactions" or "Dubai Land Department weekly report" — find total transaction count, off-plan vs secondary split
2. "Dubai mortgage registrations weekly" — mortgage vs cash transaction counts
3. "DLD weekly transaction value AED billions"
4. "Emaar Properties share price DFM" — current EMAAR.AE price
5. "DFM Real Estate Index" or "DFMREI" — current level
6. "Bayut Dubai listings count" or "Property Finder Dubai inventory" — approximate listing count

RULES:
- Return ONLY data you can verify from search results
- If a specific metric cannot be found after searching, return null for that field (do NOT guess)
- Prioritize gulfbusiness.com, arabianbusiness.com, khaleejtimes.com, dubailand.gov.ae, finance.yahoo.com, investing.com
- The data_date should reflect the reporting period, not today

Return as JSON only, no other text, wrapped in a single \`\`\`json code block:
{
  "total_transactions": number | null,
  "offplan_transactions": number | null,
  "secondary_transactions": number | null,
  "mortgage_registrations": number | null,
  "cash_transactions": number | null,
  "total_value_aed_billions": number | null,
  "dfm_re_index": number | null,
  "emaar_share_price": number | null,
  "listing_inventory": number | null,
  "data_date": "YYYY-MM-DD",
  "sources": ["list of URLs where data was found"]
}`,
      },
    ],
  });

  // Extract JSON from the response — handle multiple text blocks from web search
  const textBlocks = response.content.filter(b => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('No text response from Claude');
  }

  // Try each text block (last first — usually has the final JSON answer)
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    const text = textBlocks[i].type === 'text' ? textBlocks[i].text : '';
    // Try fenced code block first
    const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch { /* try next */ }
    }
    // Fall back to raw JSON object
    const raw = text.match(/\{[\s\S]*\}/);
    if (raw) {
      try {
        return JSON.parse(raw[0]);
      } catch { /* try next */ }
    }
  }

  throw new Error('Could not parse JSON from any response block');
}
