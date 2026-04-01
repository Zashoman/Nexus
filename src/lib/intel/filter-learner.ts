import { getServiceSupabase } from '@/lib/supabase';
import type { RatingValue, IntelItem } from '@/types/intel';

export async function updateFilterProfile(
  item: IntelItem,
  rating: RatingValue
): Promise<void> {
  const db = getServiceSupabase();

  const isPositive = rating === 'signal' || rating === 'starred';
  const isNegative = rating === 'noise' || rating === 'irrelevant';

  const keywords =
    (item.metadata as { keywords?: string[] })?.keywords || [];

  // Update keyword weights
  for (const keyword of keywords) {
    const profileType = isPositive ? 'keyword_boost' : 'keyword_suppress';
    const weightDelta = isPositive ? 0.5 : -0.5;
    const starBonus = rating === 'starred' ? 0.5 : 0;

    await upsertProfile(db, profileType, keyword.toLowerCase(), weightDelta + starBonus);
  }

  // Update source weight
  if (item.source_name) {
    const profileType = isPositive ? 'source_boost' : 'source_suppress';
    const weightDelta = isPositive ? 0.3 : -0.3;
    await upsertProfile(db, profileType, item.source_name, weightDelta);
  }

  // Update category weight
  if (item.category) {
    const weightDelta = isPositive ? 0.2 : isNegative ? -0.2 : 0;
    if (weightDelta !== 0) {
      await upsertProfile(db, 'category_weight', item.category, weightDelta);
    }
  }

  // Store the rating with metadata for future analysis
  await db.from('intel_ratings').insert({
    item_id: item.id,
    rating,
    item_category: item.category,
    item_subcategories: item.subcategories,
    item_source_name: item.source_name,
    item_keywords: keywords,
  });

  // Check if we should start auto-filtering
  const { count } = await db
    .from('intel_ratings')
    .select('*', { count: 'exact', head: true });

  if (count && count >= 50) {
    await applyAutoFilter(db);
  }
}

async function upsertProfile(
  db: ReturnType<typeof getServiceSupabase>,
  profileType: string,
  profileKey: string,
  weightDelta: number
): Promise<void> {
  // Try to get existing
  const { data: existing } = await db
    .from('intel_filter_profile')
    .select('*')
    .eq('profile_type', profileType)
    .eq('profile_key', profileKey)
    .maybeSingle();

  if (existing) {
    await db
      .from('intel_filter_profile')
      .update({
        weight: existing.weight + weightDelta,
        sample_count: existing.sample_count + 1,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await db.from('intel_filter_profile').insert({
      profile_type: profileType,
      profile_key: profileKey,
      weight: 1.0 + weightDelta,
      sample_count: 1,
    });
  }
}

async function applyAutoFilter(
  db: ReturnType<typeof getServiceSupabase>
): Promise<void> {
  // Get suppressed keywords with high weight
  const { data: suppressions } = await db
    .from('intel_filter_profile')
    .select('*')
    .eq('profile_type', 'keyword_suppress')
    .gt('sample_count', 2)
    .lt('weight', 0);

  if (!suppressions || suppressions.length === 0) return;

  const suppressedKeywords = suppressions.map((s) => s.profile_key);

  // Get recent unfiltered items
  const { data: recentItems } = await db
    .from('intel_items')
    .select('*')
    .eq('is_filtered_out', false)
    .is('ai_summary', null) // unprocessed — skip those
    .not('metadata', 'is', null)
    .order('ingested_at', { ascending: false })
    .limit(100);

  if (!recentItems) return;

  for (const item of recentItems) {
    const meta = item.metadata as { keywords?: string[] } | null;
    const itemKeywords = meta?.keywords || [];
    const matchCount = itemKeywords.filter((k: string) =>
      suppressedKeywords.includes(k.toLowerCase())
    ).length;

    // If more than half the keywords are suppressed, filter it out
    if (itemKeywords.length > 0 && matchCount / itemKeywords.length > 0.5) {
      await db
        .from('intel_items')
        .update({
          is_filtered_out: true,
          filter_reason: `Auto-filtered: matched ${matchCount} suppressed keywords`,
        })
        .eq('id', item.id);
    }
  }
}

export async function getFilterProfile() {
  const db = getServiceSupabase();

  const { data: profile } = await db
    .from('intel_filter_profile')
    .select('*')
    .order('weight', { ascending: false });

  const { count: ratingCount } = await db
    .from('intel_ratings')
    .select('*', { count: 'exact', head: true });

  // Calculate accuracy from recent ratings of previously filtered items
  const { count: falseFilters } = await db
    .from('intel_ratings')
    .select('*', { count: 'exact', head: true })
    .in('rating', ['signal', 'starred'])
    .not('item_id', 'is', null);

  return {
    profile: profile || [],
    total_ratings: ratingCount || 0,
    auto_filtering_active: (ratingCount || 0) >= 50,
    false_filter_count: falseFilters || 0,
  };
}
