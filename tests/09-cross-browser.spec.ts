import { test, expect } from '@playwright/test';

// =============================================================================
// Section 9: Cross-browser Compatibility
//
// Note: All tests run on Chromium for now. The test structure is ready to
// expand to Firefox and WebKit by adding projects in playwright.config.ts.
// =============================================================================

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 9: Cross-browser (Chromium)', () => {

  // ---------------------------------------------------------------------------
  // 9.1  All main pages render on Chromium without errors
  // ---------------------------------------------------------------------------
  const mainPages = [
    { path: '/dashboard', heading: 'Macro Dashboard' },
    { path: '/intel', heading: 'nav' },           // intel has nav sidebar, no big heading
    { path: '/youtube', heading: 'YouTube Intelligence' },
    { path: '/telegram', heading: 'Telegram' },
    { path: '/ft', heading: 'Financial Times' },
    { path: '/drones', heading: 'Drones' },
    { path: '/journal', heading: 'nav' },
  ];

  for (const pg of mainPages) {
    test(`Page ${pg.path} renders without console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];

      // Collect console errors (not warnings)
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Collect uncaught page errors
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.goto(`${BASE}${pg.path}`);
      await page.waitForLoadState('networkidle');

      // The page should have loaded — check for presence of the sidebar nav
      const sidebar = page.locator('nav').first();
      await expect(sidebar).toBeVisible();

      // Optionally check for the page-specific heading
      if (pg.heading !== 'nav') {
        const heading = page.locator(`text=${pg.heading}`).first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      }

      // There should be no uncaught JS errors
      expect(pageErrors, `Uncaught errors on ${pg.path}`).toEqual([]);

      // Filter out benign console errors (e.g., network 404 for optional resources)
      const criticalErrors = consoleErrors.filter((msg) => {
        // Ignore known benign errors
        if (msg.includes('favicon')) return false;
        if (msg.includes('404')) return false;
        if (msg.includes('net::ERR')) return false;
        return true;
      });

      // Allow up to 0 critical console errors
      expect(
        criticalErrors.length,
        `Critical console errors on ${pg.path}: ${criticalErrors.join('; ')}`
      ).toBe(0);
    });
  }

  // ---------------------------------------------------------------------------
  // 9.2  Basic navigation between pages works
  // ---------------------------------------------------------------------------
  test('Navigation between all pages via sidebar works', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // The sidebar contains links to all main pages
    const sidebarLinks = [
      { title: 'Macro Dashboard', expectedPath: '/dashboard' },
      { title: 'Intelligence', expectedPath: '/intel' },
      { title: 'YouTube Intelligence', expectedPath: '/youtube' },
      { title: 'Telegram Intelligence', expectedPath: '/telegram' },
      { title: 'Financial Times', expectedPath: '/ft' },
      { title: 'Drones & Autonomous', expectedPath: '/drones' },
      { title: 'Journal Mentor', expectedPath: '/journal' },
    ];

    for (const link of sidebarLinks) {
      const navLink = page.locator(`nav a[title="${link.title}"]`);
      if (await navLink.isVisible()) {
        await navLink.click();
        await page.waitForLoadState('networkidle');

        // Verify the URL changed to the expected path
        expect(page.url()).toContain(link.expectedPath);

        // Page should render without being blank
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 9.3  Dark theme renders consistently
  // ---------------------------------------------------------------------------
  test('Dark theme background and text colors are applied', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check body background color
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // #0B0E11 = rgb(11, 14, 17)
    expect(bodyBg).toBe('rgb(11, 14, 17)');

    // Check text color on body
    const bodyColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).color;
    });

    // #E8EAED = rgb(232, 234, 237)
    expect(bodyColor).toBe('rgb(232, 234, 237)');
  });
});
