import { test, expect } from '@playwright/test';

const BASE = 'https://nexus-xi-ivory.vercel.app';

const PAGES = [
  '/dashboard',
  '/intel',
  '/youtube',
  '/telegram',
  '/ft',
  '/drones',
  '/realestate',
  '/journal',
];

// Secret key names that must never appear in page source
const SENSITIVE_KEYS = [
  'ANTHROPIC',
  'YOUTUBE_API',
  'SUPABASE_SERVICE',
  'FRED',
  'SUPADATA',
  'FINNHUB',
  'CRON_SECRET',
  'TELEGRAM_BOT',
];

test.describe('Section 11: Security', () => {

  test.describe('XSS via URL parameters', () => {

    test('XSS script tag in query parameter is not executed', async ({ page }) => {
      // Navigate with a script injection in the query string
      const xssPayload = '?q=<script>alert(1)</script>';
      let alertFired = false;
      page.on('dialog', () => {
        alertFired = true;
      });

      for (const path of PAGES) {
        await page.goto(`${BASE}${path}${xssPayload}`, { waitUntil: 'domcontentloaded' });
        expect(alertFired).toBe(false);
      }
    });

    test('XSS via encoded script tag in search parameter is not executed', async ({ page }) => {
      const xssPayload = '?search=%3Cscript%3Ealert(%22xss%22)%3C%2Fscript%3E';
      let alertFired = false;
      page.on('dialog', () => {
        alertFired = true;
      });

      await page.goto(`${BASE}/youtube${xssPayload}`, { waitUntil: 'domcontentloaded' });
      expect(alertFired).toBe(false);

      await page.goto(`${BASE}/dashboard${xssPayload}`, { waitUntil: 'domcontentloaded' });
      expect(alertFired).toBe(false);
    });
  });

  test.describe('Reflected XSS in page source', () => {

    test('Page source does not contain unescaped script tags from URL parameters', async ({ page }) => {
      const xssPayload = '?q=<script>alert(1)</script>';
      for (const path of PAGES) {
        await page.goto(`${BASE}${path}${xssPayload}`, { waitUntil: 'domcontentloaded' });
        const content = await page.content();
        // The raw <script>alert(1)</script> should NOT appear as an unescaped tag in the DOM
        expect(content).not.toContain('<script>alert(1)</script>');
      }
    });

    test('IMG onerror XSS vector is not reflected in page source', async ({ page }) => {
      const xssPayload = '?q=<img src=x onerror=alert(1)>';
      await page.goto(`${BASE}/youtube${xssPayload}`, { waitUntil: 'domcontentloaded' });
      const content = await page.content();
      expect(content).not.toContain('onerror=alert(1)');
    });
  });

  test.describe('API keys not exposed in page source', () => {

    for (const path of PAGES) {
      test(`No API keys leaked on ${path}`, async ({ page }) => {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
        const content = await page.content();

        for (const key of SENSITIVE_KEYS) {
          // Check that environment variable names or their common patterns are not present
          // We search for patterns like ANTHROPIC_API_KEY=, YOUTUBE_API_KEY, etc.
          const patterns = [
            `${key}_KEY`,
            `${key}_SECRET`,
            `${key}_TOKEN`,
            `${key}_API`,
          ];
          for (const pattern of patterns) {
            // Look for actual key values (long alphanumeric strings after the key name)
            const regex = new RegExp(`${pattern}[=:]["']?[A-Za-z0-9_-]{10,}`, 'i');
            expect(content).not.toMatch(regex);
          }
        }
      });
    }
  });

  test.describe('Security headers', () => {

    test('Content-Security-Policy header exists on responses', async ({ page }) => {
      const response = await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      const headers = response!.headers();
      // Check for CSP — Vercel or Next.js may use different header casing
      const cspHeader = headers['content-security-policy'] || headers['Content-Security-Policy'];
      // Note: if CSP is not set, this test flags it as a security gap
      // Some deployments use content-security-policy-report-only
      const cspReportOnly = headers['content-security-policy-report-only'];
      const hasCSP = !!cspHeader || !!cspReportOnly;
      expect(hasCSP, 'Expected Content-Security-Policy header to be present').toBe(true);
    });

    test('X-Content-Type-Options: nosniff header is present', async ({ page }) => {
      const response = await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      const headers = response!.headers();
      const nosniff = headers['x-content-type-options'];
      expect(nosniff).toBe('nosniff');
    });

    test('HTTPS enforced — HTTP redirects to HTTPS', async ({ page }) => {
      // Try navigating to the HTTP version; Vercel should redirect to HTTPS
      // Since the app is on Vercel, the domain enforces HTTPS automatically.
      // We verify by checking the final URL uses HTTPS after navigation.
      const response = await page.goto(BASE.replace('https://', 'http://'), {
        waitUntil: 'domcontentloaded',
      });
      // The final URL should be HTTPS
      expect(page.url()).toMatch(/^https:\/\//);
      // Or the response should have been a redirect
      if (response) {
        expect(response.url()).toMatch(/^https:\/\//);
      }
    });
  });

  test.describe('API error handling — no stack trace leakage', () => {

    test('Invalid API endpoint returns error without stack traces', async ({ request }) => {
      const response = await request.get(`${BASE}/api/nonexistent-endpoint-12345`);
      // Should return 404 or similar error
      expect(response.status()).toBeGreaterThanOrEqual(400);

      const body = await response.text();
      // Should not contain stack trace indicators
      expect(body).not.toContain('at Function.');
      expect(body).not.toContain('at Module.');
      expect(body).not.toContain('node_modules');
      expect(body).not.toContain('Error:');
      expect(body).not.toContain('.ts:');
      expect(body).not.toContain('webpack');
    });

    test('Malformed API request does not leak stack traces', async ({ request }) => {
      // Send invalid JSON to a known API endpoint
      const response = await request.post(`${BASE}/api/youtube/summarize`, {
        headers: { 'Content-Type': 'application/json' },
        data: '{{invalid json',
      });
      const body = await response.text();
      // Should not expose internal paths or stack frames
      expect(body).not.toContain('node_modules');
      expect(body).not.toContain('at Object.');
      expect(body).not.toContain('at Function.');
    });

    test('API endpoint with unexpected method returns clean error', async ({ request }) => {
      // PATCH is likely not supported on most endpoints
      const response = await request.fetch(`${BASE}/api/youtube/feed`, {
        method: 'PATCH',
      });
      const body = await response.text();
      expect(body).not.toContain('node_modules');
      expect(body).not.toContain('at Object.');
      expect(body).not.toContain('stack');
    });
  });
});
