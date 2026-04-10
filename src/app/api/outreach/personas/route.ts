import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: List all personas
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data: personas, error } = await supabase
      .from('personas')
      .select('*')
      .order('pen_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ personas });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new persona
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('personas')
      .insert({
        pen_name: body.pen_name,
        email_address: body.email_address,
        writing_style: body.writing_style,
        example_emails: body.example_emails || [],
        avg_email_length: body.avg_email_length,
        typical_pitch_structure: body.typical_pitch_structure,
        follow_up_style: body.follow_up_style,
        vocabulary_notes: body.vocabulary_notes,
        tone_keywords: body.tone_keywords || [],
        forbidden_patterns: body.forbidden_patterns || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ persona: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
