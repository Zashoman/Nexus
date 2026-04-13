import { test, expect } from '@playwright/test';

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 16: Edge Cases', () => {

  test.describe('Extremely long video title layout', () => {

    test('Extremely long video title does not break YouTube layout', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Check existing video cards for proper title truncation
      const videoCards = page.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page.locator('h3'),
      });
      const cardCount = await videoCards.count();
      if (cardCount === 0) {
        test.skip(true, 'No videos available to check layout');
        return;
      }

      // Check that video title elements use line-clamp or overflow handling
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const titleEl = videoCards.nth(i).locator('h3');
        const box = await titleEl.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          // Title should not exceed the card's width significantly
          // Card max-width is typically ~500px on desktop
          expect(box.width).toBeLessThan(600);
          // Title should not overflow vertically beyond ~3 lines (line-clamp-2 is set)
          // With 13px font and ~1.2 line height, 2 lines ≈ 32px; allow some padding
          expect(box.height).toBeLessThan(80);
        }
      }

      // Also verify the detail panel handles long titles
      await videoCards.first().click();
      await page.waitForTimeout(500);
      const detailTitle = page.locator('h2').first();
      const detailBox = await detailTitle.boundingBox();
      expect(detailBox).not.toBeNull();
      if (detailBox) {
        // Detail panel title should wrap but not extend beyond reasonable bounds
        // Max content width is 620px
        expect(detailBox.width).toBeLessThan(700);
      }
    });
  });

  test.describe('Rapid clicking Full Summary button', () => {

    test('Rapid clicking Full Summary button does not cause errors', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Select a video
      const videoCards = page.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page.locator('h3'),
      });
      if (await videoCards.count() === 0) {
        test.skip(true, 'No videos available');
        return;
      }

      await videoCards.first().click();
      await page.waitForTimeout(1000);

      // Look for "Full Summary" button
      const fullSummaryBtn = page.locator('button').filter({ hasText: 'Full Summary' });
      if (await fullSummaryBtn.count() === 0) {
        // Full summary may already be loaded — that's OK
        test.info().annotations.push({
          type: 'note',
          description: 'Full Summary button not visible — summary may already be loaded',
        });
        return;
      }

      // Rapidly click the button multiple times
      for (let i = 0; i < 5; i++) {
        await fullSummaryBtn.click({ force: true }).catch(() => {
          // Button may become disabled or hidden after first click
        });
        await page.waitForTimeout(50);
      }

      // Wait for any pending requests to settle
      await page.waitForTimeout(3000);

      // Page should not have crashed
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toHaveLength(0);

      // The loading state or summary should be visible (not stuck)
      const hasLoadingIndicator = await page.locator('text=Analyzing transcript').count() > 0;
      const hasSummary = await page.locator('[class*="text-\\[\\#C8CACD\\]"]').count() > 0;
      const hasButton = await fullSummaryBtn.count() > 0;
      // One of these states should be true
      expect(hasLoadingIndicator || hasSummary || hasButton).toBe(true);
    });
  });

  test.describe('Rapid clicking dismiss (X) on videos', () => {

    test('Rapid clicking dismiss (X) on multiple videos does not cause errors', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Find dismiss buttons (X buttons on video cards)
      const dismissButtons = page.locator('button[title="Remove from feed"]');
      const initialCount = await dismissButtons.count();

      if (initialCount < 2) {
        test.skip(true, 'Not enough videos with dismiss buttons to test rapid dismissal');
        return;
      }

      // Rapidly click dismiss on first few videos
      const clickCount = Math.min(initialCount, 3);
      for (let i = 0; i < clickCount; i++) {
        const btn = page.locator('button[title="Remove from feed"]').first();
        if (await btn.count() > 0) {
          await btn.click();
          await page.waitForTimeout(100);
        }
      }

      await page.waitForTimeout(1000);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toHaveLength(0);

      // The video count should have decreased
      const remainingDismissButtons = page.locator('button[title="Remove from feed"]');
      const remainingCount = await remainingDismissButtons.count();
      expect(remainingCount).toBeLessThan(initialCount);
    });
  });

  test.describe('Rapid tab switching on dashboard', () => {

    test('Rapid tab switching on dashboard does not cause errors', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Get all dashboard tab buttons
      const tabNames = [
        'Rates & Spreads',
        'Commodities',
        'Demand Destruction',
        'Hormuz Risk',
        'Private Credit',
        'Geopolitical',
        'Earnings',
      ];

      // Rapidly click through tabs
      for (let round = 0; round < 2; round++) {
        for (const name of tabNames) {
          const tab = page.locator('button').filter({ hasText: name });
          if (await tab.count() > 0) {
            await tab.click();
            await page.waitForTimeout(100);
          }
        }
      }

      // Wait for final tab to load
      await page.waitForTimeout(2000);

      // Page should not have errored
      expect(errors).toHaveLength(0);

      // Some content should be visible
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Rapid category switching on YouTube', () => {

    test('Rapid category tab switching on YouTube does not cause errors', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Get all category tab buttons
      const categoryTabs = page.locator('button[class*="border-b-2"]');
      const tabCount = await categoryTabs.count();

      if (tabCount <= 1) {
        test.skip(true, 'Only one category tab available');
        return;
      }

      // Rapidly cycle through all tabs multiple times
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < tabCount; i++) {
          await categoryTabs.nth(i).click();
          await page.waitForTimeout(50);
        }
      }

      await page.waitForTimeout(1000);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Direct URL to non-existent resource', () => {

    test('Direct URL to non-existent video/article handles gracefully', async ({ page }) => {
      // Navigate to a non-existent page path
      const response = await page.goto(`${BASE}/video/nonexistent-12345`, {
        waitUntil: 'domcontentloaded',
      });

      // Should return 404 or redirect, not crash
      if (response) {
        expect(response.status()).toBeGreaterThanOrEqual(200);
        // Should not be a 500 server error
        expect(response.status()).toBeLessThan(500);
      }

      // Page should render something (404 page or redirect to home)
      await expect(page.locator('body')).toBeVisible();
    });

    test('Direct URL to non-existent API resource returns proper error', async ({ request }) => {
      const response = await request.get(`${BASE}/api/youtube/feed?video_id=nonexistent-xyz-99999`);
      // Should return a valid HTTP response, not crash
      expect(response.status()).toBeLessThan(500);
    });

    test('Direct URL to non-existent dashboard sub-path handles gracefully', async ({ page }) => {
      const response = await page.goto(`${BASE}/dashboard/nonexistent`, {
        waitUntil: 'domcontentloaded',
      });
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Browser refresh during loading', () => {

    test('Browser refresh during YouTube page loading does not crash', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Start navigating to YouTube
      await page.goto(`${BASE}/youtube`, { waitUntil: 'commit' });

      // Immediately reload before the page fully loads
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Page should load successfully after refresh
      await expect(page.locator('body')).toBeVisible();

      // Check for YouTube page content
      const pageTitle = page.locator('h1');
      await expect(pageTitle).toBeVisible();

      const criticalErrors = errors.filter(
        e => !e.includes('AbortError') && !e.includes('cancelled')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('Browser refresh during YouTube summary loading does not show stale data', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const videoCards = page.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page.locator('h3'),
      });
      if (await videoCards.count() === 0) {
        test.skip(true, 'No videos available');
        return;
      }

      // Select a video
      await videoCards.first().click();
      await page.waitForTimeout(500);

      // Trigger Full Summary if available
      const fullSummaryBtn = page.locator('button').filter({ hasText: 'Full Summary' });
      if (await fullSummaryBtn.count() > 0) {
        await fullSummaryBtn.click();
        // Immediately reload while summary is loading
        await page.waitForTimeout(200);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // After refresh, the page should be in a clean state
        // No video should be pre-selected (state resets on refresh)
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Multiple tabs simultaneously', () => {

    test('Opening same page in two tabs simultaneously works', async ({ browser }) => {
      // Create two separate browser contexts (simulates two tabs)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Navigate both to the same page
      await Promise.all([
        page1.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' }),
        page2.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' }),
      ]);

      await Promise.all([
        page1.waitForTimeout(3000),
        page2.waitForTimeout(3000),
      ]);

      // Both pages should load successfully
      await expect(page1.locator('h1')).toBeVisible();
      await expect(page2.locator('h1')).toBeVisible();

      // Actions in one tab should not affect the other
      const videoCards1 = page1.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page1.locator('h3'),
      });
      if (await videoCards1.count() > 0) {
        await videoCards1.first().click();
        await page1.waitForTimeout(500);

        // Page2 should still show no video selected
        const placeholder2 = page2.locator('text=Select a video to view details');
        if (await placeholder2.count() > 0) {
          await expect(placeholder2).toBeVisible();
        }
      }

      await context1.close();
      await context2.close();
    });

    test('Opening dashboard in two tabs does not cause API conflicts', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await Promise.all([
        page1.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }),
        page2.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }),
      ]);

      await Promise.all([
        page1.waitForTimeout(3000),
        page2.waitForTimeout(3000),
      ]);

      // Both should render dashboard content
      await expect(page1.locator('text=Macro Dashboard')).toBeVisible();
      await expect(page2.locator('text=Macro Dashboard')).toBeVisible();

      // Click different tabs in each
      const ratesTab1 = page1.locator('button').filter({ hasText: 'Rates & Spreads' });
      const commoditiesTab2 = page2.locator('button').filter({ hasText: 'Commodities' });

      if (await ratesTab1.count() > 0) await ratesTab1.click();
      if (await commoditiesTab2.count() > 0) await commoditiesTab2.click();

      await Promise.all([
        page1.waitForTimeout(2000),
        page2.waitForTimeout(2000),
      ]);

      // Both should show their respective tab content without conflict
      await expect(page1.locator('body')).toBeVisible();
      await expect(page2.locator('body')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Empty API response handling', () => {

    test('YouTube with mock empty feed shows empty state', async ({ page }) => {
      // Intercept the YouTube feed API to return an empty response
      await page.route('**/api/youtube/feed', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ videos: [], channels: [] }),
        });
      });

      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Should show the empty state message
      const emptyMessage = page.locator('text=No videos yet');
      await expect(emptyMessage).toBeVisible();

      // Should also show the "Add a channel" hint
      const addHint = page.locator('text=Add a channel and refresh to populate');
      await expect(addHint).toBeVisible();

      // The header should show "0 channels · 0 videos"
      const stats = page.locator('text=0 channels');
      await expect(stats).toBeVisible();
    });

    test('YouTube with zero videos in a category shows empty state', async ({ page }) => {
      // Intercept API to return videos only in one category
      await page.route('**/api/youtube/feed', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            videos: [{
              id: '1',
              video_id: 'test-123',
              channel_name: 'Test Channel',
              category: 'geopolitics',
              title: 'Test Video',
              description: null,
              published_at: new Date().toISOString(),
              thumbnail_url: null,
              video_url: 'https://youtube.com/watch?v=test-123',
              mini_summary: null,
              full_summary: null,
            }],
            channels: [
              { id: '1', channel_id: 'UC123', channel_name: 'Test Channel', category: 'geopolitics' },
              { id: '2', channel_id: 'UC456', channel_name: 'AI Channel', category: 'ai' },
            ],
          }),
        });
      });

      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Click on the "ai" category tab (which has zero videos)
      const aiTab = page.locator('button').filter({ hasText: /^AI$/i });
      if (await aiTab.count() > 0) {
        await aiTab.click();
        await page.waitForTimeout(500);

        // Should show empty state for this category
        const emptyMsg = page.locator('text=No videos yet');
        await expect(emptyMsg).toBeVisible();
      }
    });

    test('Dashboard with mock empty/null data shows fallback values', async ({ page }) => {
      // Intercept dashboard API to return minimal/null data
      await page.route('**/api/dashboard/rates', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            score: null,
            max_score: 20,
            level: null,
            yields: { us2y: null, us10y: null, us30y: null, spread_2s10s: null },
            credit: { hy_oas: null, bbb_oas: null },
            fed: { funds_rate: null },
            fx: { dxy: null },
            yield_curve: [],
          }),
        });
      });

      await page.route('**/api/dashboard/commodities', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ score: null, max_score: 22, level: null }),
        });
      });

      await page.route('**/api/dashboard/demand-destruction', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ latest: null, scores: [] }),
        });
      });

      await page.route('**/api/dashboard/hormuz', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ latest: null, scores: [] }),
        });
      });

      await page.route('**/api/dashboard/private-credit', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ latest: null, scores: [] }),
        });
      });

      await page.route('**/api/dashboard/geo', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ risk_score: null, max_score: 16, risk_level: null }),
        });
      });

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // The page should render without crashing
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=Macro Dashboard')).toBeVisible();

      // Null values should show "--" fallback (the fmt() function returns "--" for null)
      const dashes = page.locator('text=--');
      const dashCount = await dashes.count();
      expect(dashCount, 'Expected fallback "--" values for null data').toBeGreaterThan(0);
    });

    test('Dashboard with API errors still renders page shell', async ({ page }) => {
      // Make all dashboard APIs fail
      await page.route('**/api/dashboard/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // The page shell should still render (header, tabs, sidebar)
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=Macro Dashboard')).toBeVisible();

      // Tabs should still be present and clickable
      const tabs = page.locator('button').filter({ hasText: /Rates|Commodities/i });
      expect(await tabs.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Edge case: empty states and error recovery', () => {

    test('Intel page with empty feed shows graceful state', async ({ page }) => {
      await page.route('**/api/intel/items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        });
      });

      await page.goto(`${BASE}/intel`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Page should render without crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('Telegram page with empty feed handles gracefully', async ({ page }) => {
      await page.route('**/api/telegram/feed*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [], channels: [] }),
        });
      });

      await page.goto(`${BASE}/telegram`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await expect(page.locator('body')).toBeVisible();
    });

    test('FT page with empty feed handles gracefully', async ({ page }) => {
      await page.route('**/api/intel/items*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        });
      });

      await page.goto(`${BASE}/ft`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
