import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCached, setCache } from '@/lib/dashboard/cache';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

export async function GET() {
  const cacheKey = 'dashboard_earnings_calendar';
  const cached = await getCached(cacheKey);

  const db = getServiceSupabase();
  const { data: holdings } = await db
    .from('dashboard_holdings')
    .select('ticker, display_name, category')
    .eq('is_active', true);

  if (!holdings || holdings.length === 0) {
    return NextResponse.json({ earnings: [] });
  }

  try {
    const fromDate = new Date().toISOString().split('T')[0];
    const toDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const earnings: {
      ticker: string;
      display_name: string;
      category: string;
      date: string | null;
      eps_estimate: number | null;
      days_until: number | null;
    }[] = [];

    for (const h of holdings) {
      if (!FINNHUB_KEY) {
        earnings.push({ ticker: h.ticker, display_name: h.display_name, category: h.category, date: null, eps_estimate: null, days_until: null });
        continue;
      }

      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/calendar/earnings?symbol=${h.ticker}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await res.json();
        if (data.earningsCalendar && data.earningsCalendar.length > 0) {
          const next = data.earningsCalendar[0];
          const daysUntil = Math.ceil((new Date(next.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          earnings.push({
            ticker: h.ticker,
            display_name: h.display_name,
            category: h.category,
            date: next.date,
            eps_estimate: next.epsEstimate || null,
            days_until: daysUntil,
          });
        } else {
          earnings.push({ ticker: h.ticker, display_name: h.display_name, category: h.category, date: null, eps_estimate: null, days_until: null });
        }
      } catch {
        earnings.push({ ticker: h.ticker, display_name: h.display_name, category: h.category, date: null, eps_estimate: null, days_until: null });
      }
    }

    earnings.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const result = { earnings, updated_at: new Date().toISOString() };
    await setCache(cacheKey, result, 'finnhub', 360);
    return NextResponse.json(result);
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
