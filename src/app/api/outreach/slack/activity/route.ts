import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';
import { getSlackStatus } from '@/lib/outreach/slack';

export const dynamic = 'force-dynamic';

// GET: lightweight Slack activity feed for the main dashboard.
//   - Connection status (via auth.test — does NOT post to the channel)
//   - Status counts from slack_drafts (pending / approved / skipped / sent)
//   - Revision count (total lessons from Slack thread replies)
//   - Recent drafts posted to Slack (top 5)
export async function GET() {
  try {
    const [status, dbData] = await Promise.all([
      getSlackStatus(),
      loadSlackDb(),
    ]);

    return NextResponse.json({
      connection: status,
      counts: dbData.counts,
      revisions_total: dbData.revisions_total,
      revisions_last_24h: dbData.revisions_last_24h,
      recent: dbData.recent,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function loadSlackDb() {
  try {
    const supabase = getServiceSupabase();

    const statuses = ['pending', 'approved', 'skipped', 'sent', 'snoozed'] as const;
    const counts: Record<string, number> = {};

    const countResults = await Promise.all(
      statuses.map((s) =>
        supabase
          .from('slack_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('status', s)
      )
    );
    statuses.forEach((s, i) => {
      counts[s] = countResults[i].count || 0;
    });

    const { count: revisionsTotal } = await supabase
      .from('draft_revisions')
      .select('*', { count: 'exact', head: true });

    const { count: revisionsDay } = await supabase
      .from('draft_revisions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: recent } = await supabase
      .from('slack_drafts')
      .select('id, slack_message_ts, sender_name, subject, campaign_name, status, revision_count, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      counts,
      revisions_total: revisionsTotal || 0,
      revisions_last_24h: revisionsDay || 0,
      recent: recent || [],
    };
  } catch {
    return {
      counts: { pending: 0, approved: 0, skipped: 0, sent: 0, snoozed: 0 },
      revisions_total: 0,
      revisions_last_24h: 0,
      recent: [],
    };
  }
}
