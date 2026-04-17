import { NextResponse } from 'next/server';
import { searchPeople } from '@/lib/outreach/apollo';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const titles = url.searchParams.get('titles')?.split(',') || ['CEO'];

    const result = await searchPeople({
      person_titles: titles,
      per_page: 5,
    });

    return NextResponse.json({
      people_count: result.people.length,
      pagination: result.pagination,
      first_person_keys: result.people[0] ? Object.keys(result.people[0]) : [],
      first_person_sample: result.people[0] || null,
      all_names: result.people.map((p) => `${p.first_name} ${p.last_name} — ${p.title}`),
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
