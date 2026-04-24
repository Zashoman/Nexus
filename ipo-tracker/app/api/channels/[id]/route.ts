import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = adminClient();
  const { data, error } = await db
    .from("channels")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ channel: data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = adminClient();
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.telegram_chat_id === "string")
    patch.telegram_chat_id = body.telegram_chat_id.trim();
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (Array.isArray(body.sectors)) patch.sectors = body.sectors;
  if (body.min_raise_usd !== undefined)
    patch.min_raise_usd = Number(body.min_raise_usd);
  if (Array.isArray(body.geographies)) patch.geographies = body.geographies;
  if (Array.isArray(body.stages)) patch.stages = body.stages;
  if (Array.isArray(body.excludes)) patch.excludes = body.excludes;

  const { data, error } = await db
    .from("channels")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channel: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = adminClient();
  const { error } = await db.from("channels").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
