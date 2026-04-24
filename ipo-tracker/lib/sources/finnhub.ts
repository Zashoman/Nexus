import type { IpoDraft } from "../types";

interface FinnhubCalendarResponse {
  ipoCalendar?: Array<{
    date?: string;
    exchange?: string;
    name?: string;
    numberOfShares?: number;
    price?: string; // "10.00-12.00" or "12.00"
    status?: string; // "expected" | "priced" | "filed" | "withdrawn"
    symbol?: string;
    totalSharesValue?: number; // USD raised (when priced)
  }>;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parsePriceRange(
  price: string | undefined,
): { low: number | null; high: number | null } {
  if (!price) return { low: null, high: null };
  const parts = price.split("-").map((p) => parseFloat(p.trim()));
  if (parts.length === 1 && !Number.isNaN(parts[0])) {
    return { low: parts[0], high: parts[0] };
  }
  if (parts.length === 2 && !parts.some(Number.isNaN)) {
    return { low: parts[0], high: parts[1] };
  }
  return { low: null, high: null };
}

function normalizeStatus(status: string | undefined): "filed" | "priced" {
  if (!status) return "filed";
  const s = status.toLowerCase();
  if (s === "priced") return "priced";
  return "filed";
}

export interface FetchResult {
  items: IpoDraft[];
  error: string | null;
}

export async function fetchFinnhubIpos(daysAhead = 14): Promise<FetchResult> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return { items: [], error: "Missing FINNHUB_API_KEY" };

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + daysAhead);
  const url = `https://finnhub.io/api/v1/calendar/ipo?from=${isoDate(from)}&to=${isoDate(to)}&token=${key}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { items: [], error: `finnhub HTTP ${res.status}` };
    }
    const data = (await res.json()) as FinnhubCalendarResponse;
    const rows = data.ipoCalendar ?? [];

    const items: IpoDraft[] = rows
      .filter((r) => r.symbol && r.name)
      .map((r) => {
        const { low, high } = parsePriceRange(r.price);
        // If Finnhub didn't give us a totalSharesValue, estimate from mid-price * shares.
        let dealSize = r.totalSharesValue ?? null;
        if (!dealSize && low && r.numberOfShares) {
          const mid = high ? (low + high) / 2 : low;
          dealSize = Math.round(mid * r.numberOfShares);
        }
        return {
          ticker: (r.symbol as string).trim().toUpperCase(),
          company_name: (r.name as string).trim(),
          exchange: r.exchange?.trim() ?? null,
          stage: normalizeStatus(r.status),
          deal_size_usd: dealSize,
          price_low: low,
          price_high: high,
          shares_offered: r.numberOfShares ?? null,
          expected_date: r.date ?? null,
          business_description: null, // Finnhub calendar doesn't include this
          source: "finnhub",
          source_url: r.symbol
            ? `https://finnhub.io/stock?symbol=${encodeURIComponent(r.symbol)}`
            : null,
        };
      });

    return { items, error: null };
  } catch (err) {
    return { items: [], error: (err as Error).message };
  }
}
