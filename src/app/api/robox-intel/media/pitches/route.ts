import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('robox_pitch_angles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pitches: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const body = await req.json();

  const { title, targetOutlets, hook } = body;
  if (!title || !targetOutlets || !hook) {
    return NextResponse.json(
      { error: 'Missing required fields: title, targetOutlets, hook' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('robox_pitch_angles')
    .insert({ title, target_outlets: targetOutlets, hook })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
