import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();

  const { data: beliefs } = await db
    .from('intel_beliefs')
    .select('id')
    .eq('status', 'active');

  if (!beliefs || beliefs.length === 0) {
    return NextResponse.json({ message: 'No active beliefs' });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  for (const belief of beliefs) {
    // Count evidence in last 30 days
    const { count: count30d } = await db
      .from('intel_belief_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('belief_id', belief.id)
      .gte('created_at', thirtyDaysAgo);

    // Count evidence in the 30 days before that
    const { count: countPrior30d } = await db
      .from('intel_belief_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('belief_id', belief.id)
      .gte('created_at', sixtyDaysAgo)
      .lt('created_at', thirtyDaysAgo);

    const current = count30d || 0;
    const prior = countPrior30d || 0;

    let velocity = 'stable';
    if (prior > 0 && current > prior * 1.5) velocity = 'accelerating';
    else if (prior > 0 && current < prior * 0.5) velocity = 'decelerating';
    else if (prior === 0 && current > 2) velocity = 'accelerating';

    await db
      .from('intel_beliefs')
      .update({
        evidence_count_30d: current,
        evidence_count_prior_30d: prior,
        evidence_velocity: velocity,
        velocity_updated_at: new Date().toISOString(),
      })
      .eq('id', belief.id);
  }

  return NextResponse.json({ updated: beliefs.length });
}
