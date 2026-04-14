import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { updateFilterProfile } from '@/lib/intel/filter-learner';
import { requireAuth } from '@/lib/api-auth';
import type { RatingValue, IntelItem } from '@/types/intel';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getServiceSupabase();

  const body = await req.json();
  const { item_id, rating, feedback_note } = body as {
    item_id: string;
    rating: RatingValue;
    feedback_note?: string;
  };

  if (!item_id || !rating) {
    return NextResponse.json(
      { error: 'item_id and rating are required' },
      { status: 400 }
    );
  }

  if (!['signal', 'noise', 'starred', 'irrelevant'].includes(rating)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  // Get the item
  const { data: item, error } = await db
    .from('intel_items')
    .select('*')
    .eq('id', item_id)
    .single();

  if (error || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Check for existing rating and delete it (allow re-rating)
  await db.from('intel_ratings').delete().eq('item_id', item_id);

  // Update filter profile based on rating
  await updateFilterProfile(item as IntelItem, rating);

  // If feedback note, update the rating record
  if (feedback_note) {
    await db
      .from('intel_ratings')
      .update({ feedback_note })
      .eq('item_id', item_id);
  }

  // If previously filtered item rated as signal, correct the filter
  if (
    item.is_filtered_out &&
    (rating === 'signal' || rating === 'starred')
  ) {
    await db
      .from('intel_items')
      .update({ is_filtered_out: false, filter_reason: null })
      .eq('id', item_id);
  }

  return NextResponse.json({ success: true, rating });
}
