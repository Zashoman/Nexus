import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Section 3: Auth & Session
// ---------------------------------------------------------------------------

test.describe('Section 3 - Auth & Session', () => {

  test('Protected RE routes redirect unauthenticated users', async ({ page }) => {
    // Navigate to the RE dashboard — unauthenticated users should either
    // see the login page or the public read-only dashboard
    await page.goto('/realestate');
    await page.waitForLoadState('domcontentloaded');

    // The RE module uses Supabase auth. Unauthenticated users should see
    // either a loading state that resolves to a login redirect,
    // or the public overview without owner-only controls.
    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Check if redirected to login or if the dashboard renders in read-only mode
    const currentUrl = page.url();
    const hasLoginPage = currentUrl.includes('/login');
    const hasSignInButton = await page.locator('button:has-text("Sign In")').count();
    const hasDashboard = await page.locator('text=Dubai RE Monitor').count();

    // Either we were redirected to login, or we see the dashboard without owner buttons
    expect(hasLoginPage || hasSignInButton > 0 || hasDashboard > 0).toBeTruthy();

    // Owner-only controls (like "Refresh" button, "Weekly Input" tab) should NOT be visible
    // when unauthenticated
    const ownerRefresh = page.locator('button:has-text("Refresh")');
    const ownerWeekly = page.locator('button:has-text("Weekly Input")');

    // These should either not exist or not be visible for unauthenticated users
    if (!hasLoginPage) {
      // On the dashboard page, owner controls should be hidden
      const refreshCount = await ownerRefresh.count();
      const weeklyCount = await ownerWeekly.count();
      // We expect no owner-only controls for unauthenticated users
      expect(refreshCount + weeklyCount).toBe(0);
    }
  });

  test('Public routes accessible without auth — Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    // Dashboard should load without any auth gate
    await expect(page.locator('button:has-text("Rates & Spreads")').first()).toBeVisible({ timeout: 15_000 });
    // Verify no login redirect occurred
    expect(page.url()).toContain('/dashboard');
  });

  test('Public routes accessible without auth — Intel', async ({ page }) => {
    await page.goto('/intel');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain('/intel');
  });

  test('Public routes accessible without auth — YouTube', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain('/youtube');
  });

  test('RE login page renders correctly', async ({ page }) => {
    await page.goto('/realestate/login');
    await page.waitForLoadState('domcontentloaded');

    // Should show the Dubai RE Monitor title
    await expect(page.locator('h1:has-text("Dubai RE Monitor")')).toBeVisible({ timeout: 10_000 });

    // Should show email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should show Sign In button
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

    // Should show the description text
    await expect(page.locator('text=Real estate crisis monitoring dashboard')).toBeVisible();
  });
});
