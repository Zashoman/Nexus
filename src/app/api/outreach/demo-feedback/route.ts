import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

export const dynamic = 'force-dynamic';

// POST: capture a single feedback submission from a team member.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      feature_key: string;
      feature_label?: string;
      rating?: number;
      what_works?: string;
      what_is_missing?: string;
      would_use?: string;
      reviewer_name?: string;
      session_label?: string;
    };

    if (!body.feature_key || typeof body.feature_key !== 'string') {
      return NextResponse.json({ error: 'feature_key is required' }, { status: 400 });
    }

    const rating = typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? body.rating : null;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('demo_feedback')
      .insert({
        feature_key: body.feature_key.slice(0, 64),
        feature_label: body.feature_label?.slice(0, 128) || null,
        rating,
        what_works: body.what_works?.slice(0, 4000) || null,
        what_is_missing: body.what_is_missing?.slice(0, 4000) || null,
        would_use: body.would_use?.slice(0, 2000) || null,
        reviewer_name: body.reviewer_name?.slice(0, 128) || null,
        session_label: body.session_label?.slice(0, 128) || null,
      })
      .select('id, created_at')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, id: data?.id, created_at: data?.created_at });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: list feedback. Supports ?feature_key= and ?session_label= filters.
//      Also returns per-feature summaries (count + avg rating).
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const featureKey = url.searchParams.get('feature_key');
    const sessionLabel = url.searchParams.get('session_label');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

    const supabase = getServiceSupabase();

    const query = supabase
      .from('demo_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (featureKey) query.eq('feature_key', featureKey);
    if (sessionLabel) query.eq('session_label', sessionLabel);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Build per-feature summary
    const summary: Record<string, { count: number; avg_rating: number | null }> = {};
    (data || []).forEach((row) => {
      const r = row as { feature_key: string; rating: number | null };
      if (!summary[r.feature_key]) summary[r.feature_key] = { count: 0, avg_rating: null };
      summary[r.feature_key].count += 1;
    });
    // Avg rating per feature
    for (const key of Object.keys(summary)) {
      const ratings = (data || [])
        .filter((row) => (row as { feature_key: string }).feature_key === key)
        .map((row) => (row as { rating: number | null }).rating)
        .filter((r): r is number => typeof r === 'number');
      summary[key].avg_rating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;
    }

    return NextResponse.json({ items: data || [], summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list feedback';
    return NextResponse.json({ error: message, items: [], summary: {} }, { status: 500 });
  }
}
