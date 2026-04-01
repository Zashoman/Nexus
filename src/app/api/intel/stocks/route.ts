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

  if (!FINNHUB_KEY) {
    return NextResponse.json({ quotes, news, error: 'No Finnhub API key configured' });
  }

  // Fetch quotes and news for each symbol
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const today = Math.floor(Date.now() / 1000);
  const fromDate = new Date(thirtyDaysAgo * 1000).toISOString().split('T')[0];
  const toDate = new Date(today * 1000).toISOString().split('T')[0];

  // Process in parallel but respect rate limits (60/min free tier)
  for (const entry of watchlist) {
    try {
      // Fetch quote
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

      // Fetch company news (last 30 days)
      const newsRes = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${entry.symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const newsData = await newsRes.json();

      if (Array.isArray(newsData)) {
        news[entry.symbol] = newsData.slice(0, 15); // Cap at 15 per symbol
      }
    } catch {
      // Skip failed symbols
    }
  }

  return NextResponse.json({ quotes, news });
}
