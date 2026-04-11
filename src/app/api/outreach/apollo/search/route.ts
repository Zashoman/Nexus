import { NextResponse } from 'next/server';
import { searchPeople, type ApolloSearchFilters } from '@/lib/outreach/apollo';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// POST: search Apollo for prospects, save the search
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

    // Save search to Supabase
    const supabase = getServiceSupabase();
    const { data: search } = await supabase
      .from('apollo_searches')
      .insert({
        search_name: body.search_name || `Search ${new Date().toLocaleString()}`,
        filters,
        total_results: result.pagination.total_entries,
        prospects: result.people,
        status: 'ready',
      })
      .select('id')
      .single();

    return NextResponse.json({
      ok: true,
      search_id: search?.id,
      people: result.people,
      total: result.pagination.total_entries,
      pages: result.pagination.total_pages,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
