'use client';

/**
 * Browser fetch wrapper that adds Authorization to API requests.
 *
 * Token resolution order:
 *   1. Active Supabase session `access_token` (if the user is logged in
 *      anywhere — realestate/outreach login flows store this in
 *      localStorage and the session is shared app-wide).
 *   2. `NEXT_PUBLIC_API_BEARER_TOKEN` — shared app secret baked into the
 *      client bundle. This is weaker than a per-user session but matches
 *      the single-operator design of this app; the real security gate is
 *      the server-side `requireAuth` check in `src/lib/api-auth.ts`.
 *   3. No Authorization header — the request will 401 on any protected
 *      endpoint (GET-only public routes still work).
 *
 * Callers that already set an `Authorization` header (e.g. realestate
 * components that pass a scoped session token) are left untouched.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FALLBACK_TOKEN = process.env.NEXT_PUBLIC_API_BEARER_TOKEN;

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  return _supabase;
}

export async function getApiToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) return data.session.access_token;
    } catch {
      // fall through to fallback
    }
  }
  return FALLBACK_TOKEN ?? null;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Authorization')) {
    const token = await getApiToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
