/**
 * Shared API auth utility for state-changing route handlers.
 *
 * Accepts either:
 *   1. `Authorization: Bearer <API_BEARER_TOKEN>` — shared secret for the
 *      app's own clients (set API_BEARER_TOKEN in env).
 *   2. `Authorization: Bearer <CRON_SECRET>` — Vercel Cron compatibility.
 *   3. `Authorization: Bearer <supabase-session-jwt>` — a valid Supabase
 *      user session, validated via supabase.auth.getUser().
 *
 * Usage in a POST/PUT/DELETE/PATCH handler:
 *
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *
 * Note: `/api/re/*` handlers keep their existing role-gated auth
 * (getAuthUser + isOwner from @/lib/realestate/auth) — do not layer this
 * utility on top of those.
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type AuthResult =
  | { ok: true; user: { id: string } | null; mode: 'bearer' | 'cron' | 'session' }
  | { ok: false; response: NextResponse };

function unauthorized(message = 'Unauthorized'): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: message }, { status: 401 }) };
}

export async function requireAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized();
  }
  const token = authHeader.slice(7).trim();
  if (!token) return unauthorized();

  // 1. Shared app bearer token
  const apiToken = process.env.API_BEARER_TOKEN;
  if (apiToken && token === apiToken) {
    return { ok: true, user: null, mode: 'bearer' };
  }

  // 2. Vercel Cron secret
  const cronToken = process.env.CRON_SECRET;
  if (cronToken && token === cronToken) {
    return { ok: true, user: null, mode: 'cron' };
  }

  // 3. Supabase session JWT
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnon) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnon);
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        return { ok: true, user: { id: data.user.id }, mode: 'session' };
      }
    } catch {
      // fall through
    }
  }

  return unauthorized();
}
