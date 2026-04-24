import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = adminClient();
  const { data, error } = await db
    .from("channels")
    .select("*")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channels: data ?? [] });
}

export async function POST(req: Request) {
  const db = adminClient();
  const body = await req.json();

  const row = {
    name: String(body.name ?? "").trim(),
    telegram_chat_id: String(body.telegram_chat_id ?? "").trim(),
    is_active: Boolean(body.is_active ?? true),
    sectors: Array.isArray(body.sectors) ? body.sectors : [],
    min_raise_usd: Number(body.min_raise_usd ?? 0),
    geographies: Array.isArray(body.geographies) ? body.geographies : [],
    stages:
      Array.isArray(body.stages) && body.stages.length
        ? body.stages
        : ["filed", "priced"],
    excludes: Array.isArray(body.excludes) ? body.excludes : [],
  };

  if (!row.name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (!row.telegram_chat_id) {
    return NextResponse.json(
      { error: "telegram_chat_id required" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("channels")
    .insert(row)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channel: data });
}
