import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: list all writers with publication counts
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data: writers } = await supabase
      .from('writers')
      .select('*')
      .order('name');

    if (!writers) return NextResponse.json({ writers: [] });

    // Get publication counts per writer
    const writerIds = writers.map((w) => w.id);
    const { data: pubs } = await supabase
      .from('writer_publications')
      .select('writer_id, publication_name')
      .in('writer_id', writerIds);

    const pubCounts: Record<string, number> = {};
    const pubNames: Record<string, string[]> = {};
    for (const pub of pubs || []) {
      pubCounts[pub.writer_id] = (pubCounts[pub.writer_id] || 0) + 1;
      if (!pubNames[pub.writer_id]) pubNames[pub.writer_id] = [];
      if (!pubNames[pub.writer_id].includes(pub.publication_name)) {
        pubNames[pub.writer_id].push(pub.publication_name);
      }
    }

    const enriched = writers.map((w) => ({
      ...w,
      publication_count: pubCounts[w.id] || 0,
      publications: pubNames[w.id] || [],
    }));

    return NextResponse.json({ writers: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// POST: create a new writer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('writers').insert({
      name: body.name,
      pen_name: body.pen_name,
      website: body.website,
      linkedin: body.linkedin,
      primary_verticals: body.primary_verticals || [],
      bio: body.bio,
      writing_style: body.writing_style,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ writer: data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
