import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// State-changing methods that need origin verification
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths that should always be publicly accessible (no origin check)
// These are either webhooks from third parties or truly public endpoints
const PUBLIC_API_PATHS = [
  '/api/telegram/webhook', // Telegram sends webhooks from their own infrastructure
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

function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    // Allow same-host requests (the app itself)
    if (host && originUrl.host === host) return true;
    // Allow Vercel preview/production URLs for this app
    if (originUrl.host.endsWith('.vercel.app') && originUrl.host.includes('nexus')) return true;
    // Allow localhost for development
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Only enforce auth on /api/* routes
  const isApi = pathname.startsWith('/api/');

  if (isApi && PROTECTED_METHODS.includes(method)) {
    // Skip public webhook paths
    const isPublicPath = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

    if (!isPublicPath) {
      const authHeader = request.headers.get('authorization');
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const referer = request.headers.get('referer');

      // Check 1: Valid CRON_SECRET (for cron jobs and server-to-server)
      const cronSecret = process.env.CRON_SECRET;
      const hasValidCronSecret =
        cronSecret && authHeader === `Bearer ${cronSecret}`;

      // Check 2: Valid APP_SECRET (for your own curl/scripts)
      const appSecret = process.env.APP_SECRET;
      const hasValidAppSecret =
        appSecret && authHeader === `Bearer ${appSecret}`;

      // Check 3: Same-origin browser request
      let sameOrigin = isAllowedOrigin(origin, host);
      // Fall back to referer if origin is missing (some browsers omit it)
      if (!sameOrigin && referer) {
        sameOrigin = isAllowedOrigin(referer, host);
      }

      // Check 4: Manual refresh header (for YouTube refresh button)
      // This is an app-internal header the frontend sends; it's same-origin
      // so we keep the check but treat sameOrigin as sufficient

      // Cron paths require cron secret specifically
      const isCronPath = CRON_PATHS.some((p) => pathname.startsWith(p));
      if (isCronPath) {
        // Cron paths: require CRON_SECRET OR same-origin (for manual triggers from the app)
        if (!hasValidCronSecret && !sameOrigin && !hasValidAppSecret) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } else {
        // Regular protected paths: require same-origin OR APP_SECRET
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
