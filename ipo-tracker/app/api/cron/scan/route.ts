import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase";
import { fetchFinnhubIpos } from "@/lib/sources/finnhub";
import { fetchEdgarIpos } from "@/lib/sources/edgar";
import { fetchAsianIpos } from "@/lib/sources/asian";
import { classifyIpo } from "@/lib/classify";
import { researchCompany } from "@/lib/research";
import { routeIpo } from "@/lib/route";
import { formatIpoMessage, sendMessage } from "@/lib/telegram";
import type { Channel, Ipo, IpoDraft } from "@/lib/types";

export const maxDuration = 300; // Vercel seconds
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function logSource(
  db: ReturnType<typeof adminClient>,
  source: string,
  items_fetched: number,
  error: string | null,
) {
  await db.from("sources_log").insert({ source, items_fetched, error });
}

async function runScan() {
  const db = adminClient();
  const summary = {
    fetched: { finnhub: 0, edgar: 0, asian: 0 },
    new_ipos: 0,
    alerts_sent: 0,
    alerts_failed: 0,
    errors: [] as string[],
  };

  // 1. Fetch sources in parallel.
  const [finnhub, edgar, asian] = await Promise.all([
    fetchFinnhubIpos(14),
    fetchEdgarIpos(),
    fetchAsianIpos(),
  ]);
  summary.fetched.finnhub = finnhub.items.length;
  summary.fetched.edgar = edgar.items.length;
  summary.fetched.asian = asian.items.length;
  await Promise.all([
    logSource(db, "finnhub", finnhub.items.length, finnhub.error),
    logSource(db, "edgar", edgar.items.length, edgar.error),
    logSource(db, "asian", asian.items.length, asian.error),
  ]);
  if (finnhub.error) summary.errors.push(`finnhub: ${finnhub.error}`);
  if (edgar.error) summary.errors.push(`edgar: ${edgar.error}`);
  if (asian.error) summary.errors.push(`asian: ${asian.error}`);

  // Merge + dedup within this batch. Finnhub rows carry the most structured
  // fields so prefer them; Asian rows fill in tickers Finnhub doesn't cover.
  const batch = new Map<string, IpoDraft>();
  for (const item of [...finnhub.items, ...edgar.items, ...asian.items]) {
    if (!batch.has(item.ticker)) batch.set(item.ticker, item);
  }
  if (batch.size === 0) return summary;

  // 2. Dedup against ipos table.
  const tickers = [...batch.keys()];
  const { data: existing } = await db
    .from("ipos")
    .select("ticker")
    .in("ticker", tickers);
  const existingSet = new Set((existing ?? []).map((r) => r.ticker));
  const newDrafts = [...batch.values()].filter(
    (d) => !existingSet.has(d.ticker),
  );
  summary.new_ipos = newDrafts.length;
  if (newDrafts.length === 0) return summary;

  // 3. Load active channels once.
  const { data: channels } = await db
    .from("channels")
    .select("*")
    .eq("is_active", true);
  const activeChannels = (channels ?? []) as Channel[];

  // 4. Classify + upsert + route in sequence (Haiku calls are cheap; keep it simple).
  for (const draft of newDrafts) {
    let classification;
    try {
      classification = await classifyIpo(
        draft.company_name,
        draft.business_description,
      );
    } catch (err) {
      summary.errors.push(
        `classify ${draft.ticker}: ${(err as Error).message}`,
      );
      classification = {
        sectors: ["other" as const],
        is_spac: false,
        confidence: 0,
      };
    }

    // Web-search-backed research. Soft-fail to nulls; never block the alert.
    let research = {
      website_url: null as string | null,
      description: null as string | null,
      revenue_usd: null as number | null,
      net_income_usd: null as number | null,
      pe_ratio: null as number | null,
    };
    try {
      research = await researchCompany(draft.ticker, draft.company_name);
    } catch (err) {
      summary.errors.push(
        `research ${draft.ticker}: ${(err as Error).message}`,
      );
    }

    const ipo: Ipo = {
      ticker: draft.ticker,
      company_name: draft.company_name,
      exchange: draft.exchange ?? null,
      stage: draft.stage,
      sectors: classification.sectors,
      deal_size_usd: draft.deal_size_usd ?? null,
      price_low: draft.price_low ?? null,
      price_high: draft.price_high ?? null,
      shares_offered: draft.shares_offered ?? null,
      expected_date: draft.expected_date ?? null,
      // Prefer the researched 2-paragraph description; fall back to whatever the source provided.
      business_description: research.description ?? draft.business_description ?? null,
      source: draft.source,
      source_url: draft.source_url ?? null,
      is_spac: classification.is_spac,
      classification_confidence: classification.confidence,
      website_url: research.website_url,
      revenue_usd: research.revenue_usd,
      net_income_usd: research.net_income_usd,
      pe_ratio: research.pe_ratio,
    };

    const { error: upsertErr } = await db
      .from("ipos")
      .upsert(ipo, { onConflict: "ticker" });
    if (upsertErr) {
      summary.errors.push(`upsert ${draft.ticker}: ${upsertErr.message}`);
      continue;
    }

    // 5. Route + fan out.
    const matched = routeIpo(ipo, activeChannels);
    for (const ch of matched) {
      // Claim the (ticker, channel_id) pair via UNIQUE. If this fails with 23505 we already sent.
      const { data: inserted, error: insertErr } = await db
        .from("alerts")
        .insert({ ipo_ticker: ipo.ticker, channel_id: ch.id })
        .select("id")
        .single();
      if (insertErr) {
        // Duplicate = already sent, no-op. Log anything else.
        if (!insertErr.message.toLowerCase().includes("duplicate")) {
          summary.errors.push(
            `alert insert ${ipo.ticker}/${ch.name}: ${insertErr.message}`,
          );
        }
        continue;
      }

      const text = formatIpoMessage(ipo);
      const result = await sendMessage(ch.telegram_chat_id, text);
      if (!result.ok) {
        // Roll back so a later run retries.
        await db.from("alerts").delete().eq("id", inserted.id);
        summary.alerts_failed += 1;
        summary.errors.push(
          `telegram ${ipo.ticker}/${ch.name}: ${result.error}`,
        );
        continue;
      }

      await db
        .from("alerts")
        .update({ telegram_message_id: result.message_id ?? null })
        .eq("id", inserted.id);
      summary.alerts_sent += 1;
    }
  }

  return summary;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) return unauthorized();
  const summary = await runScan();
  return NextResponse.json({ ok: true, summary });
}

// Vercel Cron sends GET by default; expose POST for manual triggers too.
export const POST = GET;
