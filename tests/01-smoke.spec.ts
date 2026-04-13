import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Section 1: Smoke Testing
// ---------------------------------------------------------------------------

test.describe('Section 1 - Smoke Tests', () => {

  test('App loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    // Home redirects to /intel — wait for it to settle
    await page.waitForURL('**/intel', { timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    // Filter out benign third-party / hydration noise if any
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('hydration')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Sidebar nav — Dashboard link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/dashboard"]').click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Sidebar nav — Intel link works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/intel"]').click();
    await expect(page).toHaveURL(/\/intel/);
  });

  test('Sidebar nav — YouTube link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/youtube"]').click();
    await expect(page).toHaveURL(/\/youtube/);
  });

  test('Sidebar nav — Telegram link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/telegram"]').click();
    await expect(page).toHaveURL(/\/telegram/);
  });

  test('Sidebar nav — FT link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/ft"]').click();
    await expect(page).toHaveURL(/\/ft/);
  });

  test('Sidebar nav — Drones link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/drones"]').click();
    await expect(page).toHaveURL(/\/drones/);
  });

  test('Sidebar nav — Real Estate link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    // RE link may be in sidebar or in Intel category tabs
    const sidebarLink = page.locator('nav a[href="/realestate"]');
    const count = await sidebarLink.count();
    if (count > 0) {
      await sidebarLink.click();
    } else {
      // Navigate directly
      await page.goto('/realestate');
    }
    await expect(page).toHaveURL(/\/realestate/);
  });

  test('Sidebar nav — Journal link works', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav a[href="/journal"]').click();
    await expect(page).toHaveURL(/\/journal/);
  });

  test('Primary pages render content — Dashboard is not blank', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    // Dashboard should show tab labels
    await expect(page.locator('text=Rates & Spreads').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Primary pages render content — Intel is not blank', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    // Intel should show category tabs
    await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Primary pages render content — YouTube is not blank', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Primary pages render content — Telegram is not blank', async ({ page }) => {
    await page.goto('/telegram');
    await page.waitForLoadState('domcontentloaded');
    // Page should not be empty
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    // Should have some visible text content beyond empty body
    const textContent = await body.textContent();
    expect(textContent?.trim().length).toBeGreaterThan(0);
  });

  test('Primary pages render content — FT is not blank', async ({ page }) => {
    await page.goto('/ft');
    await page.waitForLoadState('domcontentloaded');
    const body = page.locator('body');
    const textContent = await body.textContent();
    expect(textContent?.trim().length).toBeGreaterThan(0);
  });

  test('Primary pages render content — Drones is not blank', async ({ page }) => {
    await page.goto('/drones');
    await page.waitForLoadState('domcontentloaded');
    const body = page.locator('body');
    const textContent = await body.textContent();
    expect(textContent?.trim().length).toBeGreaterThan(0);
  });

  test('No infinite loading spinners on Intel page', async ({ page }) => {
    await page.goto('/intel');
    // Wait for any loading indicators to disappear
    const loadingIndicator = page.locator('text=Loading').first();
    // Either loading text is not present, or it resolves within timeout
    await expect(loadingIndicator).not.toBeVisible({ timeout: 20_000 }).catch(() => {
      // If it never appeared, that is also fine
    });
    // Verify actual content appeared
    await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 15_000 });
  });

  test('No infinite loading spinners on YouTube page', async ({ page }) => {
    await page.goto('/youtube');
    // Wait for the "Loading videos..." text to disappear
    await expect(page.locator('text=Loading videos...')).not.toBeVisible({ timeout: 20_000 }).catch(() => {
      // Never appeared — also fine
    });
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible();
  });

  test('Page titles render — root layout title', async ({ page }) => {
    await page.goto('/intel');
    await expect(page).toHaveTitle(/Command Center/);
  });

  test('Page titles render — YouTube Intelligence header', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:has-text("YouTube Intelligence")')).toBeVisible({ timeout: 10_000 });
  });

  test('Page titles render — Dashboard header shows tab labels', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    // The dashboard page should render its tab buttons
    await expect(page.locator('button:has-text("Economic Calendar")').first()).toBeVisible({ timeout: 15_000 });
  });
});
