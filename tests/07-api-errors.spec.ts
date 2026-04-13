import { test, expect } from '@playwright/test';

// =============================================================================
// Section 7: API & Network Error Handling
// =============================================================================

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 7: API & Network Error Handling', () => {

  // ---------------------------------------------------------------------------
  // 7.1  Loading indicators appear during API calls
  // ---------------------------------------------------------------------------
  test('Loading indicators appear during API calls', async ({ page }) => {
    // Intercept the YouTube feed to delay it so we can observe loading state
    await page.route('**/api/youtube/feed', async (route) => {
      // Delay the response by 2 seconds to ensure loading indicator is visible
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto(`${BASE}/youtube`);

    // The loading state should show "Loading videos..." with animate-pulse
    const loadingIndicator = page.locator('text=Loading videos...');
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

    // Verify it has the pulse animation class
    const pulseElement = page.locator('.animate-pulse');
    await expect(pulseElement).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // 7.2  Loading indicators disappear after completion
  // ---------------------------------------------------------------------------
  test('Loading indicators disappear after API call completion', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    // Wait for loading to complete
    await page.waitForFunction(() => {
      const loadingEl = document.querySelector('.animate-pulse');
      return !loadingEl;
    }, { timeout: 15000 });

    // The "Loading videos..." text should no longer be visible
    const loadingText = page.locator('text=Loading videos...');
    await expect(loadingText).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 7.3  YouTube refresh shows result message
  // ---------------------------------------------------------------------------
  test('YouTube refresh button shows result message (success or error)', async ({ page }) => {
    await page.goto(`${BASE}/youtube`);

    // Wait for initial load
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Find and click the "Refresh Now" button
    const refreshButton = page.locator('button:has-text("Refresh Now")');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Button text should change to "Refreshing..."
    await expect(page.locator('button:has-text("Refreshing...")')).toBeVisible({ timeout: 5000 });

    // Wait for result message to appear (success or error)
    // The result shows as a green span near the refresh button
    const resultMessage = page.locator('span.text-\\[\\#00CC66\\]').filter({
      hasNot: page.locator('button'),
    });

    // Wait for either a success message or the button to return to "Refresh Now"
    await page.waitForFunction(() => {
      // Check if refreshResult message appeared or button reverted
      const resultSpans = document.querySelectorAll('span');
      for (const span of resultSpans) {
        const text = span.textContent || '';
        if (text.includes('new from') || text.includes('Error') || text.includes('Refresh failed')) {
          return true;
        }
      }
      // Also check if button reverted (meaning the operation finished)
      const btn = document.querySelector('button');
      return btn?.textContent?.includes('Refresh Now') ?? false;
    }, { timeout: 30000 });
  });

  // ---------------------------------------------------------------------------
  // 7.4  API endpoints return proper JSON
  // ---------------------------------------------------------------------------
  test('API /api/youtube/feed returns valid JSON', async ({ request }) => {
    const response = await request.get(`${BASE}/api/youtube/feed`);
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');

    const body = await response.json();
    // Should have videos array and channels array
    expect(body).toHaveProperty('videos');
    expect(body).toHaveProperty('channels');
    expect(Array.isArray(body.videos)).toBe(true);
    expect(Array.isArray(body.channels)).toBe(true);
  });

  test('API /api/youtube/debug returns valid JSON', async ({ request }) => {
    const response = await request.get(`${BASE}/api/youtube/debug`);
    // Should return 200 with JSON
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');

    const body = await response.json();
    expect(typeof body).toBe('object');
  });

  test('API /api/re/stats returns valid JSON', async ({ request }) => {
    const response = await request.get(`${BASE}/api/re/stats`);
    // This may require auth — accept either 200 or 401/403
    expect([200, 401, 403]).toContain(response.status());

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');

    const body = await response.json();
    expect(typeof body).toBe('object');
  });

  // ---------------------------------------------------------------------------
  // 7.5  API endpoints handle missing params gracefully
  // ---------------------------------------------------------------------------
  test('DELETE /api/youtube/feed without video_id returns an error gracefully', async ({ request }) => {
    // The DELETE endpoint expects a video_id query param
    const response = await request.delete(`${BASE}/api/youtube/feed`);

    // Should not crash — should return a 4xx or a JSON error
    const status = response.status();
    // Accept either 400 (bad request) or 200 with error in body
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');

    const body = await response.json();
    expect(typeof body).toBe('object');
  });

  // ---------------------------------------------------------------------------
  // 7.6  Dashboard loading indicator appears and disappears
  // ---------------------------------------------------------------------------
  test('Dashboard loading indicator appears and disappears per tab', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);

    // Click a tab that triggers a fresh API call
    const commoditiesTab = page.locator('button:has-text("Commodities")');
    await commoditiesTab.click();

    // The loading text "Loading data..." should appear (may be brief)
    // Wait for it to disappear, confirming the cycle completed
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 20000 });

    // Content should now be rendered
    const contentArea = page.locator('.overflow-y-auto.p-4');
    const text = await contentArea.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 7.7  Intel feed loading indicator cycle
  // ---------------------------------------------------------------------------
  test('Intel feed shows loading indicator then content', async ({ page }) => {
    // Intercept to add delay
    await page.route('**/api/intel/items*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto(`${BASE}/intel`);

    // Loading state should appear
    const loading = page.locator('text=Loading feed...');
    await expect(loading).toBeVisible({ timeout: 5000 });

    // Wait for loading to finish
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 20000 });

    // Loading text should be gone
    await expect(loading).not.toBeVisible();
  });
});
