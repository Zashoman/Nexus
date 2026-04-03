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
    max_tokens: 1024,
    tools: [
      {
        type: 'web_search' as 'web_search_20250305',
        name: 'web_search',
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Search for the latest Dubai real estate market data. Find:
1. DLD weekly transaction count (total, off-plan, secondary)
2. DLD weekly mortgage vs cash transaction split
3. DLD weekly total transaction value in AED
4. Emaar Properties current share price on DFM
5. DFM Real Estate Index current level
6. Current listing inventory count on Bayut or Property Finder (approximate)

Return ONLY the data you can verify from the search results. If you cannot find a specific metric, return null for that field. Do not guess or estimate.

Return as JSON only, no other text:
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

  // Extract JSON from the response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from response');
  }

  return JSON.parse(jsonMatch[0]);
}
