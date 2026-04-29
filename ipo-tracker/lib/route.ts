import type { Channel, Geography, Ipo } from "./types";

// Map listing exchange -> canonical geography bucket.
const EXCHANGE_MAP: Record<string, Geography> = {
  NASDAQ: "US",
  NYSE: "US",
  AMEX: "US",
  "NYSE AMERICAN": "US",
  OTC: "US",
  HKEX: "HK",
  SEHK: "HK",
  SSE: "CN",
  SZSE: "CN",
  SHANGHAI: "CN",
  SHENZHEN: "CN",
  LSE: "LSE",
  AIM: "LSE",
  EURONEXT: "EU",
  XETRA: "EU",
  FRA: "EU",
  TSX: "CA",
  TSXV: "CA",
  TSE: "JP",
  JPX: "JP",
  TYO: "JP",
  KOSPI: "KR",
  KOSDAQ: "KR",
  KRX: "KR",
  SGX: "SG",
  TWSE: "TW",
  TPE: "TW",
  ASX: "AU",
};

export function exchangeToGeography(
  exchange: string | null | undefined,
): Geography | null {
  if (!exchange) return null;
  const key = exchange.trim().toUpperCase();
  if (EXCHANGE_MAP[key]) return EXCHANGE_MAP[key];
  // Heuristic fallbacks.
  if (key.includes("NASDAQ") || key.includes("NYSE")) return "US";
  if (key.includes("HONG KONG") || key.includes("HKEX")) return "HK";
  if (key.includes("SHANGHAI") || key.includes("SHENZHEN")) return "CN";
  if (key.includes("LONDON") || key.includes("LSE")) return "LSE";
  if (key.includes("TORONTO") || key.includes("TSX")) return "CA";
  if (key.includes("TOKYO") || key.includes("JAPAN")) return "JP";
  if (key.includes("KOREA")) return "KR";
  if (key.includes("SINGAPORE")) return "SG";
  if (key.includes("TAIWAN")) return "TW";
  if (key.includes("AUSTRAL")) return "AU";
  return null;
}

export interface MatchResult {
  match: boolean;
  reason?: string;
}

export function matchIpoToChannel(ipo: Ipo, channel: Channel): MatchResult {
  if (!channel.is_active) return { match: false, reason: "channel inactive" };

  // Excludes are hard-stop.
  if (channel.excludes.includes("spac") && ipo.is_spac) {
    return { match: false, reason: "excluded: spac" };
  }
  if (channel.excludes.includes("bdc") && ipo.sectors.includes("bdc")) {
    return { match: false, reason: "excluded: bdc" };
  }

  // Stage.
  if (channel.stages.length && !channel.stages.includes(ipo.stage)) {
    return { match: false, reason: `stage ${ipo.stage} not in channel` };
  }

  // Sectors. '*' matches anything.
  if (!channel.sectors.includes("*")) {
    const overlap = ipo.sectors.some((s) => channel.sectors.includes(s));
    if (!overlap) return { match: false, reason: "no sector overlap" };
  }

  // Min raise. If the source didn't give us a deal size, treat as unknown and skip.
  // Better to drop than to spam with undersized deals.
  if (channel.min_raise_usd > 0) {
    if (!ipo.deal_size_usd || ipo.deal_size_usd < channel.min_raise_usd) {
      return { match: false, reason: "below min raise" };
    }
  }

  // Geography. If channel has geographies set, the IPO's exchange must map to one of them.
  if (channel.geographies.length) {
    const geo = exchangeToGeography(ipo.exchange);
    if (!geo || !channel.geographies.includes(geo)) {
      return { match: false, reason: "geography mismatch" };
    }
  }

  return { match: true };
}

export function routeIpo(ipo: Ipo, channels: Channel[]): Channel[] {
  return channels.filter((c) => matchIpoToChannel(ipo, c).match);
}
