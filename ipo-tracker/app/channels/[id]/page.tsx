import Link from "next/link";
import { notFound } from "next/navigation";
import ChannelEditor from "@/components/ChannelEditor";
import { adminClient } from "@/lib/supabase";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = adminClient();
  const { data, error } = await db
    .from("channels")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();

  const channel = data as Channel;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/channels"
          className="text-xs text-[var(--muted)] hover:underline"
        >
          ← Channels
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">
          Edit {channel.name}
        </h1>
      </div>
      <ChannelEditor mode="edit" initial={channel} />
    </div>
  );
}
