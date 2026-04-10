import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug endpoint — checks if Supabase env vars are configured correctly
// DELETE THIS ROUTE before production launch
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: Record<string, unknown> = {
    url_set: !!url,
    url_value: url || 'MISSING',
    anon_key_set: !!anonKey,
    anon_key_length: anonKey?.length || 0,
    anon_key_starts_with: anonKey?.substring(0, 30) || 'MISSING',
    service_key_set: !!serviceKey,
    service_key_length: serviceKey?.length || 0,
  };

  // Test with anon key
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      const { error } = await supabase.from('campaigns').select('id').limit(1);
      checks.anon_test = error ? `ERROR: ${error.message} (code: ${error.code})` : 'SUCCESS';
    } catch (err: unknown) {
      checks.anon_test = `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // Test with service role key
  if (url && serviceKey) {
    try {
      const supabase = createClient(url, serviceKey);
      const { error } = await supabase.from('campaigns').select('id').limit(1);
      checks.service_test = error ? `ERROR: ${error.message} (code: ${error.code})` : 'SUCCESS';
    } catch (err: unknown) {
      checks.service_test = `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // Test a raw fetch to see the actual HTTP response
  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/rest/v1/campaigns?select=id&limit=1`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      });
      checks.raw_fetch_status = res.status;
      checks.raw_fetch_body = await res.text();
    } catch (err: unknown) {
      checks.raw_fetch = `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json(checks, { status: 200 });
}
