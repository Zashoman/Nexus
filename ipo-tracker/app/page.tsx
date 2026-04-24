import Link from "next/link";
import { adminClient } from "@/lib/supabase";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

function filterSummary(c: Channel): string {
  const parts: string[] = [];
  if (c.min_raise_usd > 0) {
    const m = c.min_raise_usd;
    parts.push(
      `≥ $${m >= 1e9 ? (m / 1e9).toFixed(1) + "B" : (m / 1e6).toFixed(0) + "M"}`,
    );
  }
  if (c.geographies.length) parts.push(c.geographies.join("/"));
  if (c.stages.length && c.stages.length < 2) parts.push(c.stages[0]);
  if (c.excludes.length) parts.push(`excl ${c.excludes.join(",")}`);
  return parts.join(" · ") || "no filters";
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const db = adminClient();

  // eslint-disable-next-line react-hooks/purity -- server component: runs per request
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [channelsRes, alertsThisWeekRes, totalChannelsRes, lastScanRes, recentAlertsRes] =
    await Promise.all([
      db.from("channels").select("*").order("name", { ascending: true }),
      db.from("alerts").select("id", { count: "exact", head: true }).gte("sent_at", weekAgo),
      db.from("channels").select("id", { count: "exact", head: true }),
      db
        .from("sources_log")
        .select("scanned_at")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("alerts")
        .select(
          `id, sent_at,
           ipos:ipo_ticker ( ticker, company_name, stage, sectors, deal_size_usd ),
           channels:channel_id ( name )`,
        )
        .order("sent_at", { ascending: false })
        .limit(20),
    ]);

  const channels = (channelsRes.data ?? []) as Channel[];
  const activeChannels = channels.filter((c) => c.is_active).length;
  const alertsThisWeek = alertsThisWeekRes.count ?? 0;
  const totalChannels = totalChannelsRes.count ?? 0;
  const lastScan = lastScanRes.data?.scanned_at
    ? new Date(lastScanRes.data.scanned_at).toLocaleString()
    : "never";

  type AlertRow = {
    id: string;
    sent_at: string;
    ipos: {
      ticker: string;
      company_name: string;
      stage: string;
      sectors: string[];
      deal_size_usd: number | null;
    } | null;
    channels: { name: string } | null;
  };
  const recentAlerts = (recentAlertsRes.data ?? []) as unknown as AlertRow[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Fan out IPOs from Finnhub + SEC EDGAR to Telegram, classified by Claude.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Active channels" value={activeChannels} />
        <MetricCard label="Alerts this week" value={alertsThisWeek} />
        <MetricCard label="Total channels" value={totalChannels} />
        <MetricCard label="Last scan" value={lastScan} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Channels</h2>
          <Link
            href="/channels/new"
            className="text-sm px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--background)]"
          >
            + New channel
          </Link>
        </div>
        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
            No channels yet. Run the migration, or{" "}
            <Link href="/channels/new" className="underline">
              create one
            </Link>
            .
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {channels.map((c) => (
              <Link
                key={c.id}
                href={`/channels/${c.id}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--muted)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.name}</div>
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
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.sectors.slice(0, 6).map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)]"
                    >
                      {s}
                    </span>
                  ))}
                  {c.sectors.length > 6 && (
                    <span className="text-xs text-[var(--muted)]">
                      +{c.sectors.length - 6}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs text-[var(--muted)]">
                  {filterSummary(c)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent alerts</h2>
        {recentAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
            No alerts yet. Trigger a scan to populate.
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
            {recentAlerts.map((a) => (
              <div
                key={a.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {new Date(a.sent_at).toLocaleString()}
                  </span>
                  <span className="font-medium truncate">
                    {a.ipos?.company_name ?? a.ipos?.ticker ?? "—"}
                  </span>
                  {a.ipos?.ticker && (
                    <span className="text-xs text-[var(--muted)]">
                      ({a.ipos.ticker})
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted)] flex items-center gap-3">
                  {a.ipos?.stage && <span>{a.ipos.stage}</span>}
                  {a.channels?.name && <span>→ {a.channels.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
