'use client';

import { useEffect, useState } from 'react';
import { TRACKED_STOCKS } from '@/lib/intel/sources-config';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function StockTicker() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);

  useEffect(() => {
    fetchQuotes();
    // Refresh every 5 minutes during market hours
    const interval = setInterval(fetchQuotes, 300000);
    return () => clearInterval(interval);
  }, []);

  async function fetchQuotes() {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
      // Use placeholder data if no API key
      setQuotes(
        TRACKED_STOCKS.map((symbol) => ({
          symbol,
          price: 0,
          change: 0,
          changePercent: 0,
        }))
      );
      return;
    }

    try {
      const results: StockQuote[] = [];
      for (const symbol of TRACKED_STOCKS) {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        const data = await res.json();
        if (data.c) {
          results.push({
            symbol,
            price: data.c,
            change: data.d || 0,
            changePercent: data.dp || 0,
          });
        }
      }
      if (results.length > 0) setQuotes(results);
    } catch {
      // Silent fail — ticker is non-critical
    }
  }

  if (quotes.length === 0) return null;
  if (quotes.every((q) => q.price === 0)) return null;

  return (
    <div className="border-t border-[#1E2A3A] bg-[#0D1117] overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-1 animate-ticker">
        {quotes.map((q) => (
          <span key={q.symbol} className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap">
            <span className="text-[#8899AA] font-bold">{q.symbol}</span>
            <span className="text-[#E8EAED]">${q.price.toFixed(2)}</span>
            <span
              className={
                q.changePercent >= 0 ? 'text-[#00CC66]' : 'text-[#FF4444]'
              }
            >
              {q.changePercent >= 0 ? '▲' : '▼'}
              {Math.abs(q.changePercent).toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
