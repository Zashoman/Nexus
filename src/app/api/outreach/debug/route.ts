import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug endpoint — checks if Supabase env vars are configured correctly
// DELETE THIS ROUTE before production launch
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks = {
    url_set: !!url,
    url_preview: url ? `${url.substring(0, 30)}...` : 'MISSING',
    anon_key_set: !!anonKey,
    anon_key_preview: anonKey ? `${anonKey.substring(0, 20)}...` : 'MISSING',
    service_key_set: !!serviceKey,
    service_key_preview: serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING',
    connection_test: 'pending',
  };

  // Try to actually connect
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      const { error } = await supabase.from('campaigns').select('id').limit(1);
      if (error) {
        checks.connection_test = `ERROR: ${error.message}`;
      } else {
        checks.connection_test = 'SUCCESS — connected to Supabase';
      }
    } catch (err: unknown) {
      checks.connection_test = `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    checks.connection_test = 'SKIPPED — missing URL or key';
  }

  return NextResponse.json(checks, { status: 200 });
}
