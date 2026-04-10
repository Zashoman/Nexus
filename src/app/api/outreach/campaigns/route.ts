import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/outreach/supabase';

// GET: List all campaigns
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new campaign
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: body.name,
        type: body.type,
        sensitivity: body.sensitivity,
        status: body.status || 'draft',
        goals: body.goals || {},
        constraints: body.constraints || {},
        cadence_rules: body.cadence_rules || {},
        tone_guidelines: body.tone_guidelines,
        forbidden_words: body.forbidden_words || [],
        slack_channel_id: body.slack_channel_id,
        polling_interval_minutes: body.polling_interval_minutes || 15,
        business_hours_timezone: body.business_hours_timezone || 'America/New_York',
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
