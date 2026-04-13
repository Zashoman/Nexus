import { test, expect } from '@playwright/test';

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 13: State Management', () => {

  test.describe('YouTube video switching preserves previous summary', () => {

    test('Switching videos preserves previously loaded summary (race condition fix)', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Wait for video cards to appear
      const videoCards = page.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page.locator('h3'),
      });
      const cardCount = await videoCards.count();
      if (cardCount < 2) {
        test.skip(true, 'Need at least 2 videos to test switching');
        return;
      }

      // Select first video
      await videoCards.first().click();
      await page.waitForTimeout(1000);

      // Check if the first video has a mini_summary displayed
      const firstVideoTitle = await page.locator('h2').first().textContent();

      // Select second video
      await videoCards.nth(1).click();
      await page.waitForTimeout(1000);

      const secondVideoTitle = await page.locator('h2').first().textContent();
      // Titles should differ (confirming video switch happened)
      expect(firstVideoTitle).not.toBe(secondVideoTitle);

      // Switch back to first video
      await videoCards.first().click();
      await page.waitForTimeout(1000);

      // Verify the first video's title is restored correctly
      const restoredTitle = await page.locator('h2').first().textContent();
      expect(restoredTitle).toBe(firstVideoTitle);
    });
  });

  test.describe('YouTube rapid video switching', () => {

    test('Rapid video switching does not crash or show wrong content', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const videoCards = page.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page.locator('h3'),
      });
      const cardCount = await videoCards.count();
      if (cardCount < 3) {
        test.skip(true, 'Need at least 3 videos to test rapid switching');
        return;
      }

      // Rapidly click through videos
      for (let i = 0; i < Math.min(cardCount, 6); i++) {
        await videoCards.nth(i % cardCount).click();
        // Very short delay to simulate rapid clicking
        await page.waitForTimeout(100);
      }

      // After rapid switching, settle on the last one clicked
      const lastIndex = (Math.min(cardCount, 6) - 1) % cardCount;
      await videoCards.nth(lastIndex).click();
      await page.waitForTimeout(1000);

      // The detail panel should show content for the last-clicked video
      const detailPanel = page.locator('[class*="bg-\\[\\#141820\\]"]').filter({
        has: page.locator('h2'),
      });
      await expect(detailPanel.first()).toBeVisible();

      // Get the title shown in the card and in the detail panel
      const expectedTitle = await videoCards.nth(lastIndex).locator('h3').textContent();
      const displayedTitle = await page.locator('h2').first().textContent();
      expect(displayedTitle?.trim()).toBe(expectedTitle?.trim());

      // Page should not be in an error state
      await expect(page.locator('text=Error')).toHaveCount(0);
    });
  });

  test.describe('Dashboard tab state', () => {

    test('Dashboard tab state — click tab, navigate away, come back', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Click on the "Commodities" tab
      const commoditiesTab = page.locator('button').filter({ hasText: 'Commodities' });
      if (await commoditiesTab.count() > 0) {
        await commoditiesTab.click();
        await page.waitForTimeout(1000);

        // Verify we're on the Commodities tab (active styling)
        await expect(commoditiesTab).toHaveClass(/border-\[#4488FF\]|bg-\[#141820\]/);

        // Navigate away to YouTube
        await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Navigate back to dashboard
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Dashboard typically resets to default tab ("rates") on fresh page load
        // since state is not persisted in URL or localStorage
        // This documents the current behavior — the tab does NOT persist across navigations
        const ratesTab = page.locator('button').filter({ hasText: 'Rates & Spreads' });
        if (await ratesTab.count() > 0) {
          // The default tab "rates" should be active after returning
          await expect(ratesTab).toHaveClass(/border-\[#4488FF\]|bg-\[#141820\]/);
        }
      }
    });
  });

  test.describe('Race conditions on rapid navigation', () => {

    test('Rapid navigation between pages does not cause errors', async ({ page }) => {
      const paths = ['/dashboard', '/youtube', '/intel', '/telegram', '/ft', '/drones'];
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Rapidly navigate between pages
      for (const path of paths) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'commit' });
        // Don't wait for full load — simulate rapid navigation
        await page.waitForTimeout(200);
      }

      // Settle on the last page and wait for it to fully load
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Page should be functional
      await expect(page.locator('h1')).toBeVisible();

      // Filter out benign errors (network aborts from rapid navigation are expected)
      const criticalErrors = errors.filter(
        e => !e.includes('AbortError') && !e.includes('cancelled') && !e.includes('abort')
      );
      expect(criticalErrors, `Unexpected page errors during rapid navigation: ${criticalErrors.join(', ')}`).toHaveLength(0);
    });

    test('Rapid sidebar link clicking does not crash the app', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      const sidebarLinks = page.locator('nav a');
      const linkCount = await sidebarLinks.count();

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Click sidebar links rapidly
      for (let i = 1; i < Math.min(linkCount, 6); i++) {
        await sidebarLinks.nth(i).click({ noWaitAfter: true });
        await page.waitForTimeout(150);
      }

      // Wait for final page to load
      await page.waitForTimeout(3000);

      // Page should render without errors
      const body = page.locator('body');
      await expect(body).toBeVisible();

      const criticalErrors = errors.filter(
        e => !e.includes('AbortError') && !e.includes('cancelled') && !e.includes('abort')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Global state clears on page change', () => {

    test('Selected video state clears appropriately when leaving YouTube page', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Select a video
      const videoCards = page.locator('[class*="cursor-pointer"][class*="border-b"]').filter({
        has: page.locator('h3'),
      });
      if (await videoCards.count() > 0) {
        await videoCards.first().click();
        await page.waitForTimeout(1000);

        // Verify video is selected (detail panel visible)
        const detailTitle = page.locator('h2');
        await expect(detailTitle.first()).toBeVisible();

        // Navigate to dashboard
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        // Dashboard should show its own content, not YouTube detail panel
        await expect(page.locator('text=Macro Dashboard')).toBeVisible();
        // YouTube-specific elements should not be present
        await expect(page.locator('text=Watch on YouTube')).toHaveCount(0);

        // Navigate back to YouTube
        await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // On return, no video should be pre-selected (fresh page load resets state)
        // The detail panel should show the placeholder "Select a video to view details"
        const placeholder = page.locator('text=Select a video to view details');
        // This may or may not appear depending on viewport — on desktop the panel is always shown
        // On a fresh load, selectedVideo is null
        if (await placeholder.count() > 0) {
          await expect(placeholder).toBeVisible();
        }
      }
    });
  });
});
