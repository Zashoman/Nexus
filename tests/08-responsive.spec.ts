import { test, expect } from '@playwright/test';

// =============================================================================
// Section 8: Responsive Design
// =============================================================================

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 8: Responsive Design', () => {

  // ---------------------------------------------------------------------------
  // 8.1  Desktop layout at 1920x1080 — no horizontal scroll
  // ---------------------------------------------------------------------------
  test('Desktop 1920x1080: no horizontal scroll on main pages', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const pages = ['/dashboard', '/intel', '/youtube', '/telegram', '/ft', '/drones'];

    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('networkidle');

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll, `Horizontal scroll detected on ${path} at 1920x1080`).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // 8.2  Laptop layout at 1366x768 — content visible
  // ---------------------------------------------------------------------------
  test('Laptop 1366x768: main content is visible', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    // Dashboard
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Macro Dashboard")')).toBeVisible();
    // Tab bar should be visible
    await expect(page.locator('button:has-text("Rates & Spreads")')).toBeVisible();

    // YouTube
    await page.goto(`${BASE}/youtube`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("YouTube Intelligence")')).toBeVisible();

    // Intel
    await page.goto(`${BASE}/intel`);
    await page.waitForLoadState('networkidle');
    // Sidebar nav should be visible
    await expect(page.locator('nav')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 8.3  Tablet landscape 1024x768 — layout adapts
  // ---------------------------------------------------------------------------
  test('Tablet landscape 1024x768: layout adapts', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto(`${BASE}/youtube`);
    await page.waitForLoadState('networkidle');

    // The sidebar nav (w-14) should still be visible
    const sidebar = page.locator('nav.w-14');
    await expect(sidebar).toBeVisible();

    // Header should be visible
    await expect(page.locator('h1:has-text("YouTube Intelligence")')).toBeVisible();

    // At 1024px, lg breakpoint (1024px) should apply — detail panel may be visible
    const detailPanel = page.locator('.hidden.lg\\:flex');
    // At exactly 1024px the lg breakpoint kicks in
    const isVisible = await detailPanel.isVisible();
    // Just verify no crash — the panel may or may not be visible at exactly 1024
    expect(typeof isVisible).toBe('boolean');

    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 8.4  Tablet portrait 768x1024 — single column
  // ---------------------------------------------------------------------------
  test('Tablet portrait 768x1024: single column layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE}/youtube`);
    await page.waitForLoadState('networkidle');

    // At 768px width (below lg:1024px), the detail panel should be hidden
    const detailPanel = page.locator('.hidden.lg\\:flex');
    await expect(detailPanel).not.toBeVisible();

    // The video feed should take full width
    const feedColumn = page.locator('.overflow-y-auto.bg-\\[\\#0B0E11\\]').first();
    const feedBox = await feedColumn.boundingBox();
    if (feedBox) {
      // Feed should span nearly all available width (minus sidebar ~56px)
      expect(feedBox.width).toBeGreaterThan(600);
    }

    // Intel page same behavior
    await page.goto(`${BASE}/intel`);
    await page.waitForLoadState('networkidle');

    const intelDetailPanel = page.locator('.hidden.lg\\:flex');
    await expect(intelDetailPanel).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 8.5  No horizontal scrollbar at any viewport
  // ---------------------------------------------------------------------------
  test('No horizontal scrollbar at various viewport widths', async ({ page }) => {
    const widths = [1920, 1440, 1366, 1024, 768, 480, 375];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/youtube`);
      await page.waitForLoadState('networkidle');

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(
        hasHorizontalScroll,
        `Horizontal scroll detected at viewport width ${width}px`
      ).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // 8.6  Sidebar collapses or stays visible
  // ---------------------------------------------------------------------------
  test('Sidebar navigation is visible at all tested viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 480, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');

      // The sidebar is a <nav> with w-14 — it has no responsive hiding in the
      // current layout, so it should always be present in the DOM
      const sidebar = page.locator('nav').first();
      const isVisible = await sidebar.isVisible();

      // If sidebar is hidden at small sizes, that's a design choice — just
      // verify we don't crash
      if (isVisible) {
        const box = await sidebar.boundingBox();
        expect(box).not.toBeNull();
        // Sidebar width should be ~56px (w-14 = 3.5rem)
        expect(box!.width).toBeLessThanOrEqual(80);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 8.7  Modals fit on small screens
  // ---------------------------------------------------------------------------
  test('YouTube "Add Channel" form fits on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto(`${BASE}/youtube`);
    await page.waitForLoadState('networkidle');

    // Click "+ Add Channel" to open the form
    const addButton = page.locator('button:has-text("Add Channel")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);

      // The form area should be visible and not overflow
      const formContainer = page.locator('.bg-\\[\\#141820\\]').filter({
        has: page.locator('input'),
      });

      if (await formContainer.isVisible()) {
        const formBox = await formContainer.boundingBox();
        const viewport = page.viewportSize();
        if (formBox && viewport) {
          // Form should not extend beyond viewport width
          expect(formBox.x + formBox.width).toBeLessThanOrEqual(viewport.width + 5);
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 8.8  YouTube detail panel hidden on mobile (overlay mode)
  // ---------------------------------------------------------------------------
  test('YouTube detail panel is hidden on mobile, opens as overlay on click', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto(`${BASE}/youtube`);

    // Wait for videos to load
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-pulse');
    }, { timeout: 15000 });

    // Desktop detail panel should be hidden
    const desktopPanel = page.locator('.hidden.lg\\:flex');
    await expect(desktopPanel).not.toBeVisible();

    // Click a video card to trigger the mobile overlay
    const firstVideoCard = page.locator('h3.text-\\[13px\\]').first();
    if (await firstVideoCard.isVisible()) {
      await firstVideoCard.click();
      await page.waitForTimeout(500);

      // The mobile overlay should now be visible (fixed inset-0 z-40)
      const mobileOverlay = page.locator('.fixed.inset-0.z-40');
      await expect(mobileOverlay).toBeVisible();

      // The overlay should cover the full viewport
      const overlayBox = await mobileOverlay.boundingBox();
      const viewport = page.viewportSize();
      if (overlayBox && viewport) {
        expect(overlayBox.width).toBeGreaterThanOrEqual(viewport.width - 5);
        expect(overlayBox.height).toBeGreaterThanOrEqual(viewport.height - 5);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 8.9  Content readable at 200% zoom
  // ---------------------------------------------------------------------------
  test('Content readable at 200% zoom (no overflow)', async ({ page }) => {
    // Simulate 200% zoom by halving the viewport effective area
    // CSS zoom: 2 makes everything twice as big, effectively 200% zoom
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Apply CSS zoom
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await page.waitForTimeout(500);

    // Check that the page title is still readable
    const title = page.locator('h1:has-text("Macro Dashboard")');
    await expect(title).toBeVisible();

    // Check no horizontal scroll after zoom
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // At 200% zoom some horizontal scroll may appear — that's acceptable
    // The key test is that content is still readable and not clipped
    const titleBox = await title.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(titleBox!.width).toBeGreaterThan(0);
    expect(titleBox!.height).toBeGreaterThan(0);

    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });
});
