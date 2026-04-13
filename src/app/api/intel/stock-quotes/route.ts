import { NextResponse } from 'next/server';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// Tracked stock symbols — server-side proxy to avoid exposing Finnhub key in client bundle
const TRACKED = ['NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AMZN', 'TSM', 'SMCI', 'ARM', 'PLTR'];

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export async function GET() {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ quotes: [] });
  }

  const quotes: Quote[] = [];
  for (const symbol of TRACKED) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.c) {
        quotes.push({
          symbol,
          price: data.c,
          change: data.d || 0,
          changePercent: data.dp || 0,
        });
      }
    } catch {
      // Skip failed symbols, don't block others
    }
  }

  return NextResponse.json(
    { quotes },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
