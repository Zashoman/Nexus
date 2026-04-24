import Link from "next/link";
import { adminClient } from "@/lib/supabase";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtUsd(n: number): string {
  if (n <= 0) return "any";
  if (n >= 1e9) return `≥ $${(n / 1e9).toFixed(1)}B`;
  return `≥ $${(n / 1e6).toFixed(0)}M`;
}

export default async function ChannelsPage() {
  const db = adminClient();
  const { data } = await db
    .from("channels")
    .select("*")
    .order("name", { ascending: true });
  const channels = (data ?? []) as Channel[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Each channel has its own filter. One IPO can route to multiple channels.
          </p>
        </div>
        <Link
          href="/channels/new"
          className="text-sm px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--background)]"
        >
          + New channel
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          No channels yet.
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
          {channels.map((c) => (
            <Link
              key={c.id}
              href={`/channels/${c.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{c.name}</span>
                  <span
                    className={
                      "text-xs px-2 py-0.5 rounded-full border " +
                      (c.is_active
                        ? "border-green-600/40 text-green-700 dark:text-green-400"
                        : "border-[var(--border)] text-[var(--muted)]")
                    }
                  >
                    {c.is_active ? "active" : "paused"}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-1 truncate">
                  chat: {c.telegram_chat_id}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span>{c.sectors.length} sectors</span>
                <span>{fmtUsd(c.min_raise_usd)}</span>
                <span>{c.geographies.join("/") || "any geo"}</span>
                <span>{c.stages.join("/")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
