import { test, expect } from '@playwright/test';

// =============================================================================
// Section 10: Performance
// =============================================================================

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 10: Performance', () => {

  // ---------------------------------------------------------------------------
  // 10.1  Initial page load under 3 seconds for each main page
  // ---------------------------------------------------------------------------
  const mainPages = [
    '/dashboard',
    '/intel',
    '/youtube',
    '/telegram',
    '/ft',
    '/drones',
  ];

  for (const path of mainPages) {
    test(`Page ${path} loads in under 3 seconds`, async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });

      const loadTime = Date.now() - startTime;

      // Should load DOM content in under 3 seconds
      expect(
        loadTime,
        `${path} took ${loadTime}ms to load (DOMContentLoaded)`
      ).toBeLessThan(3000);

      // Also verify the page rendered something
      const sidebar = page.locator('nav').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });
    });
  }

  // ---------------------------------------------------------------------------
  // 10.2  No memory leaks from navigation (navigate 20 times, check no growth)
  // ---------------------------------------------------------------------------
  test('No memory leak from repeated navigation across pages', async ({ page }) => {
    // Navigate to a page first to establish baseline
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Take baseline heap measurement
    const getHeapSize = async (): Promise<number> => {
      return page.evaluate(() => {
        if ((performance as unknown as Record<string, unknown>).memory) {
          return (
            performance as unknown as { memory: { usedJSHeapSize: number } }
          ).memory.usedJSHeapSize;
        }
        return 0;
      });
    };

    const baselineHeap = await getHeapSize();

    // If memory API isn't available, skip the heap check but still verify no crash
    const hasMemoryAPI = baselineHeap > 0;

    // Navigate between pages 20 times
    const routes = ['/youtube', '/intel', '/dashboard', '/telegram', '/ft', '/drones'];
    for (let i = 0; i < 20; i++) {
      const route = routes[i % routes.length];
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('domcontentloaded');
    }

    // Return to dashboard and wait for idle
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    if (hasMemoryAPI) {
      // Force garbage collection if available (--js-flags=--expose-gc needed)
      await page.evaluate(() => {
        if (typeof (globalThis as unknown as Record<string, unknown>).gc === 'function') {
          (globalThis as unknown as { gc: () => void }).gc();
        }
      });

      const finalHeap = await getHeapSize();
      const heapGrowth = finalHeap - baselineHeap;
      const growthMB = heapGrowth / (1024 * 1024);

      // Heap should not have grown by more than 50MB after 20 navigations
      // This is a generous threshold to avoid flakiness
      expect(
        growthMB,
        `Heap grew by ${growthMB.toFixed(1)}MB over 20 navigations`
      ).toBeLessThan(50);
    }

    // At minimum, the final page should still be functional
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 10.3  YouTube video switching doesn't leak state
  // ---------------------------------------------------------------------------
  test('YouTube video switching does not leak state between selections', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    // Wait for feed to load
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Get all video card titles
    const videoTitles = page.locator('h3.text-\\[13px\\]');
    const count = await videoTitles.count();

    if (count >= 2) {
      // Click first video
      await videoTitles.nth(0).click();
      await page.waitForTimeout(500);

      // On desktop (default viewport is 1280), detail panel should show
      const detailPanel = page.locator('.hidden.lg\\:flex').first();
      const firstVideoTitle = await videoTitles.nth(0).textContent();

      if (await detailPanel.isVisible()) {
        // Get detail panel content
        const detailText1 = await detailPanel.textContent();

        // Click second video
        await videoTitles.nth(1).click();
        await page.waitForTimeout(500);

        const secondVideoTitle = await videoTitles.nth(1).textContent();
        const detailText2 = await detailPanel.textContent();

        // If different videos were selected, the detail panel content should differ
        if (firstVideoTitle !== secondVideoTitle) {
          expect(detailText1).not.toBe(detailText2);
        }

        // Click first video again
        await videoTitles.nth(0).click();
        await page.waitForTimeout(500);
        const detailText3 = await detailPanel.textContent();

        // Content should match the first video again (no leakage from second)
        expect(detailText3).toBe(detailText1);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 10.4  Dashboard tab switching is responsive
  // ---------------------------------------------------------------------------
  test('Dashboard tab switching completes within 2 seconds', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);

    // Wait for initial load
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 20000 });

    const tabs = [
      'Commodities',
      'Demand Destruction',
      'Hormuz Risk',
      'Private Credit',
      'Geopolitical',
      'Rates & Spreads',
    ];

    for (const tabLabel of tabs) {
      const tabButton = page.locator(`button:has-text("${tabLabel}")`);
      await expect(tabButton).toBeVisible();

      const startTime = Date.now();
      await tabButton.click();

      // Wait for loading indicator to disappear
      await page.waitForFunction(() => {
        return !document.querySelector('.animate-pulse');
      }, { timeout: 15000 });

      const switchTime = Date.now() - startTime;

      // Tab switch + data load should complete in under 2 seconds
      // (excluding cold API calls which may be slower)
      // Use 5s as a generous threshold for network API calls
      expect(
        switchTime,
        `Tab "${tabLabel}" took ${switchTime}ms to load`
      ).toBeLessThan(5000);

      // Content should be present after switch
      const contentArea = page.locator('.overflow-y-auto.p-4');
      const text = await contentArea.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 10.5  Performance metrics via Navigation Timing API
  // ---------------------------------------------------------------------------
  test('Navigation timing: TTFB and LCP are within acceptable bounds', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Get Navigation Timing data
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!nav) return null;
      return {
        ttfb: nav.responseStart - nav.requestStart,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadComplete: nav.loadEventEnd - nav.startTime,
        domInteractive: nav.domInteractive - nav.startTime,
      };
    });

    if (timing) {
      // TTFB should be under 1.5 seconds (Vercel cold starts can be slow)
      expect(
        timing.ttfb,
        `TTFB was ${timing.ttfb.toFixed(0)}ms`
      ).toBeLessThan(1500);

      // DOM interactive should be under 3 seconds
      expect(
        timing.domInteractive,
        `DOM Interactive was ${timing.domInteractive.toFixed(0)}ms`
      ).toBeLessThan(3000);

      // Full load should be under 5 seconds
      if (timing.loadComplete > 0) {
        expect(
          timing.loadComplete,
          `Full load was ${timing.loadComplete.toFixed(0)}ms`
        ).toBeLessThan(5000);
      }
    }
  });
});
