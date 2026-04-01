import { getServiceSupabase } from '@/lib/supabase';
import type { IntelItem } from '@/types/intel';

/**
 * Layer 2: Fuzzy grouping of related items from different sources.
 * Groups items that cover the same story.
 */
export async function deduplicateNewItems(): Promise<number> {
  const db = getServiceSupabase();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Get recent items that aren't already in a group
  const { data: recentItems } = await db
    .from('intel_items')
    .select('*')
    .gte('ingested_at', cutoff)
    .not('ai_summary', 'is', null)
    .order('ingested_at', { ascending: false })
    .limit(200);

  if (!recentItems || recentItems.length < 2) return 0;

  const items = recentItems as IntelItem[];

  // Get existing groups to skip already-grouped items
  const { data: existingGroups } = await db
    .from('intel_item_groups')
    .select('grouped_item_ids')
    .gte('created_at', cutoff);

  const alreadyGrouped = new Set<string>();
  for (const group of existingGroups || []) {
    for (const id of group.grouped_item_ids) {
      alreadyGrouped.add(id);
    }
  }

  const ungrouped = items.filter((item) => !alreadyGrouped.has(item.id));
  let groupsCreated = 0;

  // Compare items pairwise using keyword overlap
  const processed = new Set<string>();

  for (let i = 0; i < ungrouped.length; i++) {
    if (processed.has(ungrouped[i].id)) continue;

    const itemA = ungrouped[i];
    const keywordsA = getKeywords(itemA);
    const cluster: IntelItem[] = [itemA];

    for (let j = i + 1; j < ungrouped.length; j++) {
      if (processed.has(ungrouped[j].id)) continue;

      const itemB = ungrouped[j];
      const keywordsB = getKeywords(itemB);

      // Check keyword overlap
      const overlap = keywordsA.filter((k) => keywordsB.includes(k));
      if (overlap.length < 3) continue;

      // Check title similarity
      const titleSim = jaccardSimilarity(
        itemA.title.toLowerCase().split(/\s+/),
        itemB.title.toLowerCase().split(/\s+/)
      );
      if (titleSim < 0.3) continue;

      // Check time proximity (within 24 hours)
      const timeA = new Date(itemA.published_at || itemA.ingested_at).getTime();
      const timeB = new Date(itemB.published_at || itemB.ingested_at).getTime();
      if (Math.abs(timeA - timeB) > 24 * 60 * 60 * 1000) continue;

      cluster.push(itemB);
      processed.add(itemB.id);
    }

    if (cluster.length >= 2) {
      processed.add(itemA.id);

      // Pick highest-tier source as primary
      cluster.sort((a, b) => a.source_tier - b.source_tier);
      const primary = cluster[0];

      await db.from('intel_item_groups').insert({
        primary_item_id: primary.id,
        grouped_item_ids: cluster.map((c) => c.id),
        group_title: primary.title,
        source_count: cluster.length,
      });

      groupsCreated++;
    }
  }

  return groupsCreated;
}

function getKeywords(item: IntelItem): string[] {
  const meta = item.metadata as { keywords?: string[] } | null;
  if (meta?.keywords && Array.isArray(meta.keywords)) {
    return meta.keywords.map((k) => k.toLowerCase());
  }
  // Fallback: extract from title + subcategories
  const words = item.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return [...words, ...(item.subcategories || [])];
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
