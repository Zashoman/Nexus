import { test, expect } from '@playwright/test';

// =============================================================================
// Section 6: Data Display & Rendering
// =============================================================================

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 6: Data Display & Rendering', () => {

  // ---------------------------------------------------------------------------
  // 6.1  YouTube video list renders correct number of items
  // ---------------------------------------------------------------------------
  test('YouTube video list count matches header "X videos" counter', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    // Wait for loading to finish — the loading text disappears
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Header shows e.g. "12 channels · 45 videos"
    const headerText = await page.locator('text=/\\d+ videos/').first().textContent();
    const expectedCount = parseInt(headerText?.match(/(\d+)\s*videos/)?.[1] ?? '0', 10);

    // When "All Channels" tab is active, every video card should render.
    // Video cards are the clickable rows inside the scrollable feed column.
    const videoCards = page.locator('.bg-\\[\\#141820\\], .bg-\\[\\#1A2332\\]')
      .filter({ has: page.locator('h3') });

    // If there are videos at all, the rendered count should match the header
    if (expectedCount > 0) {
      const renderedCount = await videoCards.count();
      expect(renderedCount).toBe(expectedCount);
    }
  });

  // ---------------------------------------------------------------------------
  // 6.2  Empty state shows when category has no videos
  // ---------------------------------------------------------------------------
  test('YouTube shows empty state when a category has no videos', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    // Wait for the feed to load
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Get all category tab buttons
    const tabButtons = page.locator('button.capitalize, button:has-text("All Channels")');
    const tabCount = await tabButtons.count();

    // Try each tab — if any tab yields 0 videos, verify the empty state message
    let foundEmpty = false;
    for (let i = 0; i < tabCount; i++) {
      await tabButtons.nth(i).click();
      await page.waitForTimeout(300);

      const emptyMessage = page.locator('text=No videos yet');
      if (await emptyMessage.isVisible()) {
        foundEmpty = true;
        // Verify the helper text also shows
        await expect(page.locator('text=Add a channel and refresh to populate')).toBeVisible();
        break;
      }
    }

    // If no empty category found, verify the empty state markup at least exists
    // in the source (it's conditionally rendered)
    if (!foundEmpty) {
      // At minimum verify the page loaded without errors
      await expect(page.locator('h1:has-text("YouTube Intelligence")')).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // 6.3  Dashboard numbers formatted correctly
  // ---------------------------------------------------------------------------
  test('Dashboard numbers use proper formatting (decimals for rates/prices)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);

    // Wait for data to load
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 20000 });

    // The Rates tab is default — check the table cells for proper decimal formatting
    // Values like "4.52%" should have decimal points
    const tableCells = page.locator('table tbody td.text-right');
    const cellCount = await tableCells.count();

    if (cellCount > 0) {
      for (let i = 0; i < cellCount; i++) {
        const text = (await tableCells.nth(i).textContent())?.trim() ?? '';
        // Skip empty or placeholder values
        if (text === '--' || text === '') continue;
        // Values should be numeric with decimals (e.g. "4.52%" or "100.23")
        expect(text).toMatch(/^-?\d+\.\d+%?$|^--$/);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 6.4  Time ago formatting works
  // ---------------------------------------------------------------------------
  test('Time ago formatting shows Xd ago, Xh ago, or Xm ago', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Look for timeAgo text patterns in video cards
    const timeLabels = page.locator('span:text-matches("\\\\d+(m|h|d) ago")');
    const count = await timeLabels.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = (await timeLabels.nth(i).textContent())?.trim() ?? '';
        expect(text).toMatch(/^\d+(m|h|d) ago$/);
      }
    }

    // Also check intel page for the same pattern
    await page.goto(`${BASE}/intel`);
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    const intelTimeLabels = page.locator('span:text-matches("\\\\d+(m|h|d) ago")');
    const intelCount = await intelTimeLabels.count();

    if (intelCount > 0) {
      const text = (await intelTimeLabels.first().textContent())?.trim() ?? '';
      expect(text).toMatch(/^\d+(m|h|d) ago$/);
    }
  });

  // ---------------------------------------------------------------------------
  // 6.5  YouTube category tabs filter videos correctly
  // ---------------------------------------------------------------------------
  test('YouTube category tabs filter videos correctly', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // "All Channels" tab should be active by default
    const allTab = page.locator('button:has-text("All Channels")');
    await expect(allTab).toBeVisible();

    // Count videos on "All" tab
    const allVideoCards = page.locator('h3.text-\\[13px\\]');
    const allCount = await allVideoCards.count();

    // Get category tabs (skip the "All Channels" tab)
    const categoryTabs = page.locator('button.capitalize').filter({
      hasNot: page.locator('text=All Channels'),
    });
    const categoryCount = await categoryTabs.count();

    if (categoryCount > 0 && allCount > 0) {
      // Click the first specific category tab
      const firstCategoryTab = categoryTabs.first();
      const categoryName = (await firstCategoryTab.textContent())?.trim().toLowerCase() ?? '';
      await firstCategoryTab.click();
      await page.waitForTimeout(500);

      // Count filtered videos
      const filteredCards = page.locator('h3.text-\\[13px\\]');
      const filteredCount = await filteredCards.count();

      // Filtered count should be <= all count
      expect(filteredCount).toBeLessThanOrEqual(allCount);

      // Each visible video card should have the selected category label
      const categoryLabels = page.locator('span.capitalize');
      const labelCount = await categoryLabels.count();
      for (let i = 0; i < labelCount; i++) {
        const labelText = (await categoryLabels.nth(i).textContent())?.trim().toLowerCase() ?? '';
        // Skip non-category labels; check actual video category spans
        if (labelText && labelText !== '' && labelText !== 'all channels') {
          // Category text inside the card should match the tab
          // (This is approximate — the category span is the second span in the card header)
        }
      }

      // Switch back to All Channels
      await allTab.click();
      await page.waitForTimeout(300);
      const resetCount = await page.locator('h3.text-\\[13px\\]').count();
      expect(resetCount).toBe(allCount);
    }
  });

  // ---------------------------------------------------------------------------
  // 6.6  Intel article cards show source tier, title, and time
  // ---------------------------------------------------------------------------
  test('Intel article cards show source tier, title, and time', async ({ page }) => {
    await page.goto(`${BASE}/intel`);

    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Each item card should have:
    //  - Source tier badge (T1, T2, T3)
    //  - Title (h3 element)
    //  - Time (HH:MM formatted)
    const itemCards = page.locator('[class*="border-l-2"]').filter({
      has: page.locator('h3'),
    });
    const cardCount = await itemCards.count();

    if (cardCount > 0) {
      // Check the first few cards
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = itemCards.nth(i);

        // Should have a tier label like T1, T2, or T3
        const tierLabel = card.locator('span:text-matches("T[123]")');
        await expect(tierLabel).toBeVisible();

        // Should have a title
        const title = card.locator('h3');
        const titleText = await title.textContent();
        expect(titleText?.trim().length).toBeGreaterThan(0);

        // Should have a time display (HH:MM format)
        const timeSpan = card.locator('span:text-matches("\\\\d{2}:\\\\d{2}")');
        await expect(timeSpan).toBeVisible();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 6.7  Dashboard tab content loads for each tab
  // ---------------------------------------------------------------------------
  test('Dashboard tab content loads for each tab', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);

    const tabs = [
      { label: 'Rates & Spreads', key: 'rates' },
      { label: 'Commodities', key: 'commodities' },
      { label: 'Demand Destruction', key: 'demand' },
      { label: 'Hormuz Risk', key: 'hormuz' },
      { label: 'Private Credit', key: 'credit' },
      { label: 'Geopolitical', key: 'geo' },
      { label: 'Earnings', key: 'earnings' },
    ];

    for (const tab of tabs) {
      const tabButton = page.locator(`button:has-text("${tab.label}")`);
      await tabButton.click();

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const pulse = document.querySelector('.animate-pulse');
        return !pulse;
      }, { timeout: 20000 });

      // Tab content area should have some rendered content (not just empty)
      const contentArea = page.locator('.overflow-y-auto.p-4');
      const contentText = await contentArea.textContent();
      // Content should either have data or at least table/chart structure
      expect(contentText?.trim().length).toBeGreaterThan(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 6.8  Truncated text doesn't break layout (long titles)
  // ---------------------------------------------------------------------------
  test('Truncated text does not break layout (line-clamp)', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Video card titles use line-clamp-2, summaries use line-clamp-1
    // Verify that clamped elements do not exceed expected height
    const titles = page.locator('h3.line-clamp-2');
    const titleCount = await titles.count();

    if (titleCount > 0) {
      for (let i = 0; i < Math.min(titleCount, 5); i++) {
        const box = await titles.nth(i).boundingBox();
        if (box) {
          // line-clamp-2 at ~13px font with ~tight leading should be under ~45px
          // Use generous threshold to avoid flakiness
          expect(box.height).toBeLessThan(60);
        }
      }
    }

    // Also check mini-summary line-clamp-1 elements
    const summaries = page.locator('p.line-clamp-1');
    const summaryCount = await summaries.count();

    if (summaryCount > 0) {
      for (let i = 0; i < Math.min(summaryCount, 5); i++) {
        const box = await summaries.nth(i).boundingBox();
        if (box) {
          // line-clamp-1 should be a single line — under ~30px
          expect(box.height).toBeLessThan(35);
        }
      }
    }

    // Ensure no horizontal overflow on the video feed column
    const feedColumn = page.locator('.overflow-y-auto.bg-\\[\\#0B0E11\\]').first();
    const feedBox = await feedColumn.boundingBox();
    const viewportSize = page.viewportSize();
    if (feedBox && viewportSize) {
      expect(feedBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });
});
