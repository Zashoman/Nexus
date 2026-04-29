import { NextResponse } from "next/server";
import { fetchFinnhubIpos } from "@/lib/sources/finnhub";
import { fetchEdgarIpos } from "@/lib/sources/edgar";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Debug endpoint: returns the raw items from each source, so we can see
// whether HK / international tickers actually appear in Finnhub's calendar.
//
// Usage:
//   curl "https://.../api/debug/sources?days=21" \
//     -H "Authorization: Bearer $CRON_SECRET"

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "21");

  const [finnhub, edgar] = await Promise.all([
    fetchFinnhubIpos(days),
    fetchEdgarIpos(),
  ]);

  return NextResponse.json({
    days_ahead: days,
    finnhub: {
      count: finnhub.items.length,
      error: finnhub.error,
      items: finnhub.items.map((i) => ({
        ticker: i.ticker,
        company_name: i.company_name,
        exchange: i.exchange,
        stage: i.stage,
        deal_size_usd: i.deal_size_usd,
        expected_date: i.expected_date,
      })),
    },
    edgar: {
      count: edgar.items.length,
      error: edgar.error,
      items: edgar.items.map((i) => ({
        ticker: i.ticker,
        company_name: i.company_name,
        source_url: i.source_url,
      })),
    },
  });
}
