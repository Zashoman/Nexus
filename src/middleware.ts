import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================
// SECURITY: deployment-scope isolation + journal password gate
// ============================================================
// 1. Deployment-scope isolation (BLUE TREE BRAIN DEPLOYMENT)
//    The bluetreebrain Vercel project serves the entire monorepo
//    from the same codebase. If we shared that URL with external
//    teammates, they could hit /journal, /intel, /api/journal/*,
//    etc., and extract the owner's personal data.
//    We block every non-outreach path on that deployment by:
//      a) checking the `DEPLOYMENT_MODE=outreach-only` env var, OR
//      b) matching the hostname against 'bluetreebrain' / 'blue-tree-brain'
//    Either signal flips the deployment into outreach-only mode.
//
// 2. Journal password gate (ALL DEPLOYMENTS)
//    Defense-in-depth for the personal intelligence deployment:
//    even on the primary `nexus-*` URL, /journal and /api/journal/*
//    require a secret. Owner bootstraps the cookie once via
//    `/journal?key=<JOURNAL_ACCESS_KEY>`; everyone else sees a 404.
// ============================================================

// State-changing methods that need origin verification
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths that should always be publicly accessible (no origin check)
// These are either webhooks from third parties or truly public endpoints.
// Third-party webhooks originate from the provider's own infrastructure,
// so they don't carry a matching Origin header. We bypass the origin
// check for them and (where possible) rely on provider-specific request
// signing at the route level for authentication.
const PUBLIC_API_PATHS = [
  '/api/telegram/webhook', // Telegram sends webhooks from their own infrastructure
  '/api/outreach/slack/events', // Slack Events API — signed requests from slack.com
];

// Paths that are allowed to be called with just the CRON_SECRET
// (Vercel cron hits these with Authorization: Bearer <CRON_SECRET>)
const CRON_PATHS = [
  '/api/intel/fetch',
  '/api/intel/synthesis',
  '/api/intel/weekly-synthesis',
  '/api/intel/monthly-synthesis',
  '/api/intel/velocity',
  '/api/youtube/refresh',
];

// ------------------------------------------------------------
// Deployment-scope: outreach-only mode
// ------------------------------------------------------------
function isOutreachOnlyDeployment(host: string): boolean {
  // Explicit opt-in via env var wins (set DEPLOYMENT_MODE=outreach-only
  // on the bluetreebrain Vercel project to lock it down even under a
  // custom domain that doesn't contain "bluetreebrain").
  if (process.env.DEPLOYMENT_MODE === 'outreach-only') return true;

  const h = host.toLowerCase();

  // Custom domains for Blue Tree Brain (outreach-only app)
  if (h === 'bluetreebrainapp.com' || h === 'www.bluetreebrainapp.com') return true;

  // Matches every bluetreebrain Vercel deployment (preview + production,
  // including the Git-based preview URL pattern).
  if (h.startsWith('bluetreebrain')) return true;
  if (h.startsWith('blue-tree-brain')) return true;
  if (h.includes('-bluetreebrain-')) return true;
  if (h.includes('-blue-tree-brain-')) return true;
  return false;
}

function isOutreachPath(pathname: string): boolean {
  return pathname.startsWith('/outreach') || pathname.startsWith('/api/outreach');
}

function isInternalPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}

// ------------------------------------------------------------
// App-wide password gate (for personal intelligence app)
// ------------------------------------------------------------
const INTEL_DOMAINS = ['intelapp.dev', 'www.intelapp.dev'];

function isIntelDomain(host: string): boolean {
  const h = host.toLowerCase().split(':')[0];
  return INTEL_DOMAINS.includes(h);
}

const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Login — Intel App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #0B0E11; color: #E8EAED; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .card {
      background: #161B22; border: 1px solid #1E2A3A; border-radius: 12px;
      padding: 40px; width: 100%; max-width: 380px; text-align: center;
    }
    h1 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 13px; color: #8B949E; margin-bottom: 24px; }
    input {
      width: 100%; height: 44px; padding: 0 14px; border-radius: 8px;
      border: 1px solid #1E2A3A; background: #0D1117; color: #E8EAED;
      font-size: 14px; outline: none; margin-bottom: 16px;
    }
    input:focus { border-color: #4488FF; }
    button {
      width: 100%; height: 44px; border-radius: 8px; border: none;
      background: #4488FF; color: white; font-size: 14px; font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #5599FF; }
    .err { color: #F85149; font-size: 12px; margin-top: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Intelligence App</h1>
    <p>Enter the access password to continue.</p>
    <form method="GET">
      <input type="password" name="key" placeholder="Password" autofocus required />
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`;

// ------------------------------------------------------------
// Journal password gate
// ------------------------------------------------------------
function isJournalPath(pathname: string): boolean {
  return (
    pathname === '/journal' ||
    pathname.startsWith('/journal/') ||
    pathname.startsWith('/api/journal/')
  );
}

// ------------------------------------------------------------
// Origin verification helpers
// ------------------------------------------------------------
function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    // Allow same-host requests (the app itself)
    if (host && originUrl.host === host) return true;
    // Allow Vercel preview/production URLs for this app
    if (originUrl.host.endsWith('.vercel.app') && originUrl.host.includes('nexus')) return true;
    // Also allow the bluetreebrain Vercel project domains (same codebase,
    // different project name — same-origin fetches against /api/outreach/*
    // come from these hostnames on the outreach-only deployment).
    if (
      originUrl.host.endsWith('.vercel.app') &&
      (originUrl.host.includes('bluetreebrain') || originUrl.host.includes('blue-tree-brain'))
    ) {
      return true;
    }
    // Allow localhost for development
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

// ============================================================

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const host = request.headers.get('host') || '';

  // ------------------------------------------------------------
  // Gate 1 (highest priority): Deployment-scope isolation.
  //   On the bluetreebrain deployment, refuse everything that
  //   isn't an outreach route or an essential Next.js internal.
  //   API calls get a 404 (don't even hint the routes exist);
  //   page navigations get a redirect to /outreach.
  // ------------------------------------------------------------
  if (isOutreachOnlyDeployment(host)) {
    if (!isOutreachPath(pathname) && !isInternalPath(pathname)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      // Treat bare / as "go to the outreach landing page"
      return NextResponse.redirect(new URL('/outreach', request.url));
    }
  }

  // ------------------------------------------------------------
  // Gate 1.5: App-wide password gate for intelapp.dev.
  //   If APP_PASSWORD is set and the host is intelapp.dev, every
  //   page and API route requires a cookie. First visit shows a
  //   clean login form. Cookie is set for 30 days.
  // ------------------------------------------------------------
  const appPassword = process.env.APP_PASSWORD;
  if (appPassword && isIntelDomain(host) && !isInternalPath(pathname)) {
    // Allow cron jobs through (they carry CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const hasValidCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const appSecret = process.env.APP_SECRET;
    const hasValidAppSecret = appSecret && authHeader === `Bearer ${appSecret}`;

    if (!hasValidCronSecret && !hasValidAppSecret) {
      const cookie = request.cookies.get('app_auth')?.value;
      const queryKey = request.nextUrl.searchParams.get('key');

      // Query-param login: set cookie + redirect to clean URL
      if (queryKey && queryKey === appPassword) {
        const cleanUrl = new URL(request.nextUrl.toString());
        cleanUrl.searchParams.delete('key');
        const response = NextResponse.redirect(cleanUrl);
        response.cookies.set('app_auth', appPassword, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
        return response;
      }

      // No valid cookie → block
      if (cookie !== appPassword) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return new NextResponse(LOGIN_PAGE_HTML, {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
  }

  // ------------------------------------------------------------
  // Gate 2: Journal password gate (applies to all deployments).
  //   If JOURNAL_ACCESS_KEY is set in the environment, every
  //   /journal UI and /api/journal/* request must present a matching
  //   cookie. Owner bootstraps the cookie with /journal?key=<secret>.
  //   Unauthenticated page loads see a 404 (we don't reveal that the
  //   journal exists); API calls get 401 JSON.
  // ------------------------------------------------------------
  const journalKey = process.env.JOURNAL_ACCESS_KEY;
  if (journalKey && isJournalPath(pathname)) {
    const providedQueryKey = request.nextUrl.searchParams.get('key');
    const cookieKey = request.cookies.get('journal_auth')?.value;

    // Case A: query-param bootstrap — set cookie and continue
    if (providedQueryKey && providedQueryKey === journalKey) {
      // Strip the ?key= from the URL so it never shows in the address bar
      const cleanUrl = new URL(request.nextUrl.toString());
      cleanUrl.searchParams.delete('key');
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set('journal_auth', journalKey, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return response;
    }

    // Case B: cookie already present and matches — continue normally
    if (cookieKey && cookieKey === journalKey) {
      // fall through to the rest of the middleware
    } else {
      // Case C: no valid credential — block
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return new NextResponse('Not found', { status: 404 });
    }
  }

  // ------------------------------------------------------------
  // Gate 3 (existing): origin / CORS enforcement on protected
  //   state-changing API calls. Unchanged from before.
  // ------------------------------------------------------------
  const isApi = pathname.startsWith('/api/');

  if (isApi && PROTECTED_METHODS.includes(method)) {
    const isPublicPath = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

    if (!isPublicPath) {
      const authHeader = request.headers.get('authorization');
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');

      const cronSecret = process.env.CRON_SECRET;
      const hasValidCronSecret =
        cronSecret && authHeader === `Bearer ${cronSecret}`;

      const appSecret = process.env.APP_SECRET;
      const hasValidAppSecret =
        appSecret && authHeader === `Bearer ${appSecret}`;

      let sameOrigin = isAllowedOrigin(origin, host);
      if (!sameOrigin && referer) {
        sameOrigin = isAllowedOrigin(referer, host);
      }

      const isCronPath = CRON_PATHS.some((p) => pathname.startsWith(p));
      if (isCronPath) {
        if (!hasValidCronSecret && !sameOrigin && !hasValidAppSecret) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } else {
        if (!sameOrigin && !hasValidAppSecret) {
          return NextResponse.json(
            { error: 'Forbidden: request must originate from the app' },
            { status: 403 }
          );
        }
      }
    }
  }

  const response = NextResponse.next();

  // Security headers (applied to all responses)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
