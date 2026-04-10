import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug endpoint — checks ALL env vars
// DELETE THIS ROUTE before production launch
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const instantlyKey = process.env.INSTANTLY_API_KEY;

  const checks: Record<string, unknown> = {
    supabase_url_set: !!url,
    supabase_anon_set: !!anonKey,
    supabase_service_set: !!serviceKey,
    instantly_key_set: !!instantlyKey,
    instantly_key_preview: instantlyKey ? `${instantlyKey.substring(0, 15)}...` : 'MISSING',
    instantly_key_length: instantlyKey?.length || 0,
    supabase_test: 'pending',
    build_time: new Date().toISOString(),
  };

  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      const { error } = await supabase.from('campaigns').select('id').limit(1);
      checks.supabase_test = error ? `ERROR: ${error.message}` : 'SUCCESS';
    } catch (err: unknown) {
      checks.supabase_test = `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json(checks);
}
