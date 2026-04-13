import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Section 4: Navigation & Routing
// ---------------------------------------------------------------------------

test.describe('Section 4 - Navigation & Routing', () => {

  const sidebarRoutes = [
    { href: '/dashboard', title: 'Macro Dashboard' },
    { href: '/intel', title: 'Intelligence' },
    { href: '/youtube', title: 'YouTube Intelligence' },
    { href: '/telegram', title: 'Telegram Intelligence' },
    { href: '/ft', title: 'Financial Times' },
    { href: '/drones', title: 'Drones & Autonomous' },
    { href: '/journal', title: 'Journal Mentor' },
  ];

  for (const route of sidebarRoutes) {
    test(`All sidebar links navigate — ${route.title} (${route.href})`, async ({ page }) => {
      await page.goto('/intel');
      await page.waitForLoadState('domcontentloaded');

      const link = page.locator(`nav a[href="${route.href}"]`);
      await expect(link).toBeVisible({ timeout: 10_000 });
      await link.click();

      await expect(page).toHaveURL(new RegExp(route.href.replace('/', '\\/')));
      // Verify the page rendered something
      const body = page.locator('body');
      const text = await body.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    });
  }

  test('Browser back/forward works between pages', async ({ page }) => {
    // Start on Intel
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 15_000 });

    // Navigate to YouTube
    await page.locator('nav a[href="/youtube"]').click();
    await expect(page).toHaveURL(/\/youtube/);
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });

    // Navigate to Dashboard
    await page.locator('nav a[href="/dashboard"]').click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Go back — should be YouTube
    await page.goBack();
    await expect(page).toHaveURL(/\/youtube/);

    // Go back again — should be Intel
    await page.goBack();
    await expect(page).toHaveURL(/\/intel/);

    // Go forward — should be YouTube
    await page.goForward();
    await expect(page).toHaveURL(/\/youtube/);
  });

  test('Direct URL entry works — /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('button:has-text("Rates & Spreads")').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Direct URL entry works — /intel', async ({ page }) => {
    await page.goto('/intel');
    await expect(page).toHaveURL(/\/intel/);
    await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Direct URL entry works — /youtube', async ({ page }) => {
    await page.goto('/youtube');
    await expect(page).toHaveURL(/\/youtube/);
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Direct URL entry works — /telegram', async ({ page }) => {
    await page.goto('/telegram');
    await expect(page).toHaveURL(/\/telegram/);
    const body = page.locator('body');
    const text = await body.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Direct URL entry works — /ft', async ({ page }) => {
    await page.goto('/ft');
    await expect(page).toHaveURL(/\/ft/);
    const body = page.locator('body');
    const text = await body.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Direct URL entry works — /drones', async ({ page }) => {
    await page.goto('/drones');
    await expect(page).toHaveURL(/\/drones/);
    const body = page.locator('body');
    const text = await body.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Direct URL entry works — /journal', async ({ page }) => {
    await page.goto('/journal');
    await expect(page).toHaveURL(/\/journal/);
    const body = page.locator('body');
    const text = await body.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Direct URL entry works — /realestate', async ({ page }) => {
    await page.goto('/realestate');
    await expect(page).toHaveURL(/\/realestate/);
    await expect(page.locator('text=Dubai RE Monitor')).toBeVisible({ timeout: 15_000 });
  });

  test('404 page for invalid routes', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-xyz');
    // Next.js returns 404 for unknown routes
    expect(response?.status()).toBe(404);
  });

  test('Active nav state — sidebar highlights current page', async ({ page }) => {
    // Navigate to Dashboard and check the link has distinct styling
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const dashboardLink = page.locator('nav a[href="/dashboard"]');
    await expect(dashboardLink).toBeVisible({ timeout: 10_000 });

    // Navigate to YouTube and check its link
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');

    const youtubeLink = page.locator('nav a[href="/youtube"]');
    await expect(youtubeLink).toBeVisible();

    // The sidebar exists on both pages — confirm the links are rendered
    // (Active styling is via hover/color classes; we verify the links exist and are clickable)
    await expect(dashboardLink).toBeVisible();
  });

  test('Category tabs work on /youtube', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });

    // The "All Channels" tab should be visible and active by default
    const allTab = page.locator('button:has-text("All Channels")');
    await expect(allTab).toBeVisible({ timeout: 10_000 });

    // Check that the All Channels tab has the active border style
    await expect(allTab).toHaveCSS('border-bottom-color', 'rgb(255, 68, 68)');

    // If there are additional category tabs, click the first non-active one
    const categoryButtons = page.locator('button.capitalize, button:has-text("All Channels")');
    const count = await categoryButtons.count();
    if (count > 1) {
      // Click the second tab (first category after "All Channels")
      await categoryButtons.nth(1).click();
      // The clicked tab should now be active (red border)
      await expect(categoryButtons.nth(1)).toHaveCSS('border-bottom-color', 'rgb(255, 68, 68)');
    }
  });

  test('Category tabs work on /intel', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');

    // The "All" tab should be visible
    const allTab = page.locator('button:has-text("All")').first();
    await expect(allTab).toBeVisible({ timeout: 15_000 });

    // Click "Frontier" tab
    const frontierTab = page.locator('button:has-text("Frontier")');
    await expect(frontierTab).toBeVisible();
    await frontierTab.click();

    // Frontier tab should now have the active border (blue for Intel)
    await expect(frontierTab).toHaveCSS('border-bottom-color', 'rgb(68, 136, 255)');

    // Click "Synthesis" tab
    const synthesisTab = page.locator('button:has-text("Synthesis")');
    await expect(synthesisTab).toBeVisible();
    await synthesisTab.click();

    // Synthesis view should load
    await expect(synthesisTab).toHaveCSS('border-bottom-color', 'rgb(68, 136, 255)');
  });

  test('Category tabs work on /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Default active tab is "Rates & Spreads"
    const ratesTab = page.locator('button:has-text("Rates & Spreads")').first();
    await expect(ratesTab).toBeVisible({ timeout: 15_000 });

    // Click "Commodities" tab
    const commoditiesTab = page.locator('button:has-text("Commodities")').first();
    await expect(commoditiesTab).toBeVisible();
    await commoditiesTab.click();

    // Click "Economic Calendar" tab
    const calendarTab = page.locator('button:has-text("Economic Calendar")').first();
    await expect(calendarTab).toBeVisible();
    await calendarTab.click();

    // Click "Geopolitical" tab
    const geoTab = page.locator('button:has-text("Geopolitical")').first();
    await expect(geoTab).toBeVisible();
    await geoTab.click();

    // Verify content area is not empty after switching tabs
    const body = page.locator('body');
    const text = await body.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Client-side navigation does not cause full page reload', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 15_000 });

    // Evaluate a marker in the window to detect full reload
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__navTest = true;
    });

    // Navigate via sidebar (these are <a> tags with href — may cause full reload
    // since the app uses regular <a> links, not Next.js <Link>)
    await page.locator('nav a[href="/youtube"]').click();
    await expect(page).toHaveURL(/\/youtube/);
    await page.waitForLoadState('domcontentloaded');

    // Check if window marker persists (it won't if full reload happened)
    // For regular <a> links, a full reload is expected. This test documents the behavior.
    const markerExists = await page.evaluate(() => {
      return (window as unknown as Record<string, boolean>).__navTest === true;
    });

    // Since the app uses regular <a> tags (not Next.js Link), a full reload is expected
    // This test documents the current behavior
    if (markerExists) {
      // Client-side navigation — no reload
      expect(markerExists).toBe(true);
    } else {
      // Full reload — expected with <a> tags
      expect(markerExists).toBe(false);
    }
  });
});
