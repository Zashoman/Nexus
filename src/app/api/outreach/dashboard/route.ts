import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: Dashboard overview data
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // Fetch campaigns, pending drafts, and recent activity in parallel
    const [campaignsRes, pendingDraftsRes, recentThreadsRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('*')
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false }),

      supabase
        .from('drafts')
        .select('*, email_threads(contact_name, contact_email, publication_name, campaign_id), campaigns(name, type)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('email_threads')
        .select('*, campaigns(name, type)')
        .order('updated_at', { ascending: false })
        .limit(20),
    ]);

    // Count pending approvals
    const { count: pendingCount } = await supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Count today's sent emails
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: sentToday } = await supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayStart.toISOString());

    // Count today's replies
    const { count: repliesToday } = await supabase
      .from('email_threads')
      .select('*', { count: 'exact', head: true })
      .gte('last_reply_at', todayStart.toISOString());

    return NextResponse.json({
      campaigns: campaignsRes.data || [],
      pending_drafts: pendingDraftsRes.data || [],
      recent_threads: recentThreadsRes.data || [],
      metrics: {
        pending_approvals: pendingCount || 0,
        emails_sent_today: sentToday || 0,
        replies_received_today: repliesToday || 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
