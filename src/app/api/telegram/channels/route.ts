import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from("intel_telegram_channels")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channels: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const body = await req.json();

  const { username, display_name, category } = body;
  if (!display_name || !category) {
    return NextResponse.json({ error: "display_name and category required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("intel_telegram_channels")
    .insert({ username: username || null, display_name, category })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channel: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.from("intel_telegram_channels").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ success: true });
}
