import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 200);

  const db = adminClient();
  const { data, error } = await db
    .from("alerts")
    .select(
      `id, sent_at, telegram_message_id,
       ipos:ipo_ticker ( ticker, company_name, exchange, stage, sectors, deal_size_usd ),
       channels:channel_id ( id, name )`,
    )
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}
