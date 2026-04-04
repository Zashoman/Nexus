import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

interface CompanyNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// Headlines that indicate noise — not company-specific news
const NOISE_PATTERNS = [
  /how much.*would have/i,
  /if you.*invested/i,
  /\$\d+.*years? ago/i,
  /best stocks to buy/i,
  /top \d+ stocks/i,
  /stocks? to watch/i,
  /should you buy/i,
  /is it time to/i,
  /dividend aristocrat/i,
  /passive income/i,
  /retire early/i,
  /millionaire/i,
  /wall street.*(love|hate|think)/i,
  /analyst.*(upgrade|downgrade|rating)/i,
  /price target/i,
  /bull case|bear case/i,
  /vs\.\s/i,
  /compared to/i,
  /better than/i,
  /gold price/i,
  /bitcoin/i,
  /crypto/i,
];

// Headlines that indicate signal — company-specific news
const SIGNAL_PATTERNS = [
  /earnings|revenue|profit|loss|EPS/i,
  /CEO|CFO|COO|management|appoint|resign/i,
  /contract|deal|agreement|partnership/i,
  /lawsuit|sued|litigation|settlement|SEC/i,
  /acquisition|merger|buyout/i,
  /guidance|forecast|outlook/i,
  /production|output|capacity/i,
  /dividend|buyback|repurchase/i,
  /FDA|approval|permit|license/i,
  /IPO|offering|filing/i,
  /layoff|restructur|workforce/i,
  /quarterly|annual report|10-K|10-Q|8-K/i,
];

function isRelevantNews(item: CompanyNews, companyName: string, symbol: string): boolean {
  const text = `${item.headline} ${item.summary}`;

  // Reject if matches noise patterns
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Accept if matches signal patterns
  for (const pattern of SIGNAL_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  // Accept if headline contains company name or symbol directly
  const headlineLower = item.headline.toLowerCase();
  if (headlineLower.includes(symbol.toLowerCase()) || headlineLower.includes(companyName.toLowerCase())) {
    return true;
  }

  // Default: include it (Finnhub already filtered by symbol)
  return true;
}

export async function GET() {
  const db = getServiceSupabase();

  const { data: watchlist } = await db
    .from('intel_watchlist')
    .select('*')
    .order('added_at', { ascending: true });

  if (!watchlist || watchlist.length === 0) {
    return NextResponse.json({ quotes: {}, news: {} });
  }

  const quotes: Record<string, Quote> = {};
  const news: Record<string, CompanyNews[]> = {};
  const earnings: Record<string, { date: string; estimate: number | null }> = {};

  if (!FINNHUB_KEY) {
    return NextResponse.json({ quotes, news, error: 'No Finnhub API key configured' });
  }

  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const today = Math.floor(Date.now() / 1000);
  const fromDate = new Date(thirtyDaysAgo * 1000).toISOString().split('T')[0];
  const toDate = new Date(today * 1000).toISOString().split('T')[0];

  for (const entry of watchlist) {
    try {
      const quoteRes = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${entry.symbol}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const quoteData = await quoteRes.json();

      if (quoteData.c && quoteData.c > 0) {
        quotes[entry.symbol] = {
          symbol: entry.symbol,
          price: quoteData.c,
          change: quoteData.d || 0,
          changePercent: quoteData.dp || 0,
          high: quoteData.h || 0,
          low: quoteData.l || 0,
          open: quoteData.o || 0,
          prevClose: quoteData.pc || 0,
        };
      }

      const newsRes = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${entry.symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const newsData = await newsRes.json();

      if (Array.isArray(newsData)) {
        // Filter to only company-specific news
        const filtered = newsData.filter((item: CompanyNews) =>
          isRelevantNews(item, entry.company_name, entry.symbol)
        );
        news[entry.symbol] = filtered.slice(0, 15);
      }

      // Fetch upcoming earnings
      const earningsFromDate = new Date().toISOString().split('T')[0];
      const earningsToDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const earningsRes = await fetch(
        `https://finnhub.io/api/v1/calendar/earnings?symbol=${entry.symbol}&from=${earningsFromDate}&to=${earningsToDate}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const earningsData = await earningsRes.json();
      if (earningsData.earningsCalendar && earningsData.earningsCalendar.length > 0) {
        const next = earningsData.earningsCalendar[0];
        earnings[entry.symbol] = {
          date: next.date,
          estimate: next.epsEstimate || null,
        };
      }
    } catch {
      // Skip failed symbols
    }
  }

  return NextResponse.json({ quotes, news, earnings });
}
