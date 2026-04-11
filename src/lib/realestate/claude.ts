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
        max_uses: 15,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Search for the latest Dubai real estate weekly market data. You must complete ALL searches below before responding. Do not stop early even if some searches return nothing.

REQUIRED SEARCHES (run each as a separate search):

1. Search: "Dubai real estate market week" reliantsurveyors — this blog publishes the full weekly DLD breakdown with off-plan vs secondary sales AND mortgage vs cash split in a table
2. Search: "DLD weekly transactions gulfbusiness" — gulfbusiness.com publishes DLD weekly updates with sales breakdown
3. Search: "Dubai property transactions week off-plan secondary" — backup for the sales split
4. Search: "Dubai mortgage registrations weekly DLD" — mortgage count (separate from sales)
5. Search: "Dubai cash transactions property weekly" — cash transaction count
6. Search: "EMAAR.AE share price" finance.yahoo.com — Emaar Properties current price
7. Search: "DFMREI DFM Real Estate Index current" — current index level
8. Search: "Bayut Dubai listings count" — approximate total Dubai listings

CRITICAL RULES FOR BREAKDOWNS:
- Off-plan + secondary should sum to total_sales (which is often reported separately from total_transactions)
- If you find total sales + off-plan count in the same source, derive secondary = total_sales - off-plan
- If you find total sales + secondary count, derive off-plan = total_sales - secondary
- Same logic applies for mortgage/cash: if you find total + one, derive the other
- If a blog or news article shows a table with weekly DLD data, extract EVERY column from it — do not skip any field that's visible

SOURCE PRIORITY:
- reliantsurveyors.com weekly blog posts typically have the FULL breakdown in one table
- gulfbusiness.com and arabianbusiness.com DLD updates
- dubailand.gov.ae if accessible
- khaleejtimes.com, zawya.com, pro-partner.com

- Only return null if you have searched AT LEAST 3 sources for that specific field and none have it
- data_date should reflect the week the data covers, not today

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
