import type { Ipo } from "./types";

const SECTOR_EMOJI: Record<string, string> = {
  biotech: "🧬",
  diagnostics: "🧬",
  oncology: "🧬",
  "rare-disease": "🧬",
  metabolic: "🧬",
  medtech: "🩺",
  defense: "🛡️",
  cuas: "🛡️",
  aerospace: "✈️",
  space: "🚀",
  "dual-use": "🛡️",
  "ai-infra": "🤖",
  "ai-software": "🤖",
  semis: "🔌",
  quantum: "⚛️",
  robotics: "🤖",
  cybersecurity: "🔐",
  fintech: "💳",
  saas: "☁️",
  energy: "⚡",
  mining: "⛏️",
  commodities: "🛢️",
  consumer: "🛍️",
  industrials: "🏭",
  "healthcare-services": "🏥",
  "real-estate": "🏢",
  "advanced-materials": "🧪",
  hardware: "🔧",
  spac: "🪙",
  bdc: "🏦",
  other: "📈",
};

function pickEmoji(sectors: string[]): string {
  for (const s of sectors) {
    if (SECTOR_EMOJI[s]) return SECTOR_EMOJI[s];
  }
  return "📈";
}

// Telegram HTML requires escaping <, >, &. Nothing else.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatUsd(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatPe(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return `${n.toFixed(1)}x`;
}

export function formatIpoMessage(ipo: Ipo): string {
  const emoji = pickEmoji(ipo.sectors);
  const stageLabel = ipo.stage.toUpperCase();
  const primary = (ipo.sectors[0] ?? "other").toUpperCase();
  const headline = `${emoji} <b>${escapeHtml(stageLabel)} · ${escapeHtml(primary)}</b>`;

  const nameLine = `<b>${escapeHtml(ipo.company_name)}</b> (${escapeHtml(ipo.ticker)})`;

  const rows: string[] = [];
  if (ipo.exchange) rows.push(`Exchange: ${escapeHtml(ipo.exchange)}`);
  if (ipo.expected_date) rows.push(`Expected: ${escapeHtml(ipo.expected_date)}`);

  const priceRange =
    ipo.price_low && ipo.price_high
      ? `$${ipo.price_low.toFixed(2)}–$${ipo.price_high.toFixed(2)}`
      : ipo.price_low
        ? `$${ipo.price_low.toFixed(2)}`
        : null;
  if (priceRange) rows.push(`Price range: ${priceRange}`);

  if (ipo.sectors.length) {
    rows.push(`Sectors: ${ipo.sectors.map(escapeHtml).join(", ")}`);
  }

  // Financial metrics block — only render if we have at least one.
  const finRows: string[] = [];
  const revenue = formatUsd(ipo.revenue_usd);
  if (revenue) finRows.push(`Revenue (TTM): ${revenue}`);
  if (ipo.net_income_usd !== null && ipo.net_income_usd !== undefined) {
    const ni = ipo.net_income_usd;
    if (ni < 0) {
      const lossLabel = formatUsd(Math.abs(ni));
      if (lossLabel) finRows.push(`Net income: −${lossLabel}`);
    } else {
      const gainLabel = formatUsd(ni);
      if (gainLabel) finRows.push(`Net income: ${gainLabel}`);
    }
  }
  const pe = formatPe(ipo.pe_ratio);
  if (pe) finRows.push(`P/E (offer): ${pe}`);

  // 2-paragraph description from research. Cap length so messages stay sane.
  const desc = ipo.business_description
    ? escapeHtml(ipo.business_description.slice(0, 1500))
    : "";

  const links: string[] = [];
  if (ipo.website_url) {
    links.push(`<a href="${escapeHtml(ipo.website_url)}">Website</a>`);
  }
  if (ipo.source_url) {
    links.push(`<a href="${escapeHtml(ipo.source_url)}">Source</a>`);
  }

  // Each section is its own block. Join with a blank line between blocks.
  const sections: string[] = [];
  sections.push(`${headline}\n${nameLine}`);
  if (rows.length) sections.push(rows.join("\n"));
  if (finRows.length) sections.push(`<b>Financials</b>\n${finRows.join("\n")}`);
  if (desc) sections.push(desc);
  if (links.length) sections.push(links.join(" · "));

  return sections.join("\n\n");
}

export interface SendResult {
  ok: boolean;
  message_id?: number;
  error?: string;
}

export async function sendMessage(
  chatId: string,
  text: string,
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    if (!data.ok) {
      return { ok: false, error: data.description ?? `HTTP ${res.status}` };
    }
    return { ok: true, message_id: data.result?.message_id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
