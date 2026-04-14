import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('robox_media_contacts')
    .select('*')
    .order('relevance')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ contacts: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const body = await req.json();

  const { name, outlet, type, beat, notes, relevance, linkedin_url, email } = body;
  if (!name || !outlet || !type) {
    return NextResponse.json(
      { error: 'Missing required fields: name, outlet, type' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('robox_media_contacts')
    .insert({ name, outlet, type, beat, notes, relevance, linkedin_url, email })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
