import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { runPipeline } from '@/lib/robox-intel/pipeline';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceSupabase();

  // Get the source key
  const { data: source, error } = await supabase
    .from('robox_sources')
    .select('source_key')
    .eq('id', parseInt(id))
    .single();

  if (error || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  const result = await runPipeline([source.source_key]);

  return NextResponse.json({
    newSignals: result.newSignals,
    errors: result.errors,
  });
}
