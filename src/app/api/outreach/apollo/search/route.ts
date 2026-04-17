import { NextResponse } from 'next/server';
import { searchPeople, type ApolloSearchFilters } from '@/lib/outreach/apollo';
import { scoreAndSortProspects } from '@/lib/outreach/qualification';
import { getExcludedEmails } from '@/lib/outreach/exclusion';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// POST: search Apollo for prospects, score + sort, save search
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const filters: ApolloSearchFilters = {
      person_titles: body.person_titles,
      organization_industries: body.organization_industries,
      organization_num_employees_ranges: body.organization_num_employees_ranges,
      person_locations: body.person_locations,
      organization_locations: body.organization_locations,
      organization_funding_stage: body.organization_funding_stage,
      q_keywords: body.q_keywords,
      per_page: body.per_page || 25,
    };

    const result = await searchPeople(filters);

    // Exclude do-not-contact emails
    const emails = result.people.map((p) => p.email).filter(Boolean) as string[];
    const excluded = await getExcludedEmails(emails);
    const filtered = result.people.filter((p) => !p.email || !excluded.has(p.email.toLowerCase()));

    // Apply qualification scoring and sort by score
    const scored = scoreAndSortProspects(filtered);

    // Save search to Supabase
    const supabase = getServiceSupabase();
    const { data: search } = await supabase
      .from('apollo_searches')
      .insert({
        search_name: body.search_name || `Search ${new Date().toLocaleString()}`,
        filters,
        total_results: result.pagination.total_entries,
        prospects: scored,
        status: 'ready',
      })
      .select('id')
      .single();

    return NextResponse.json({
      ok: true,
      search_id: search?.id,
      people: scored,
      total: result.pagination.total_entries,
      pages: result.pagination.total_pages,
      _debug_people_count: result.people.length,
      _debug_pagination: result.pagination,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
