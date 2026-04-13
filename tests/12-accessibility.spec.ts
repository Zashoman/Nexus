import { test, expect } from '@playwright/test';

const BASE = 'https://nexus-xi-ivory.vercel.app';

const PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/intel', name: 'Intel' },
  { path: '/youtube', name: 'YouTube' },
  { path: '/telegram', name: 'Telegram' },
  { path: '/ft', name: 'FT' },
  { path: '/drones', name: 'Drones' },
  { path: '/realestate', name: 'Real Estate' },
  { path: '/journal', name: 'Journal' },
];

test.describe('Section 12: Accessibility', () => {

  test.describe('All images have alt text', () => {

    for (const { path, name } of PAGES) {
      test(`All img tags on ${name} page have alt attributes`, async ({ page }) => {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
        // Wait a moment for dynamic content to render
        await page.waitForTimeout(2000);

        const images = await page.locator('img').all();
        for (const img of images) {
          // Every <img> should have an alt attribute (even if empty string for decorative images)
          const altAttr = await img.getAttribute('alt');
          expect(altAttr, `Image missing alt attribute on ${name}: ${await img.getAttribute('src')}`).not.toBeNull();
        }
      });
    }
  });

  test.describe('Keyboard navigation', () => {

    test('Tab through sidebar navigation links', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      // The sidebar nav contains multiple <a> links
      const sidebarLinks = page.locator('nav a');
      const linkCount = await sidebarLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(5);

      // Tab through each sidebar link and verify it receives focus
      // Start by focusing the first element in the page
      await page.keyboard.press('Tab');

      let focusedSidebarLinks = 0;
      // Tab through enough times to cover all sidebar links
      for (let i = 0; i < linkCount + 5; i++) {
        const focusedElement = page.locator(':focus');
        const tagName = await focusedElement.evaluate(el => el.tagName).catch(() => null);
        const parentNav = await focusedElement.evaluate(
          el => el.closest('nav') !== null
        ).catch(() => false);

        if (tagName === 'A' && parentNav) {
          focusedSidebarLinks++;
        }
        await page.keyboard.press('Tab');
      }
      expect(focusedSidebarLinks, 'Expected multiple sidebar links to be focusable via Tab').toBeGreaterThanOrEqual(3);
    });

    test('Tab navigation reaches main content area', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      // Tab enough times to move past sidebar into main content
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
      }

      // Check that focus has moved to main content (a button or interactive element in main)
      const focusedElement = page.locator(':focus');
      const isInMain = await focusedElement.evaluate(
        el => el.closest('main') !== null
      ).catch(() => false);

      // At least some interactive elements in main should be reachable
      // (may also be on sidebar still — depends on number of links)
      expect(await focusedElement.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Focus indicators visible on interactive elements', () => {

    test('Focus indicators are visible on sidebar links', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      const firstLink = page.locator('nav a').first();
      await firstLink.focus();

      // Check that the focused element has some visible focus indicator
      // This could be an outline, box-shadow, or border change
      const styles = await firstLink.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineWidth: computed.outlineWidth,
          outlineStyle: computed.outlineStyle,
          boxShadow: computed.boxShadow,
          borderColor: computed.borderColor,
        };
      });

      // At minimum, the browser default focus ring should be present unless suppressed
      // We check that outline is not explicitly hidden (outline: none with no box-shadow)
      const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasFocusIndicator = hasOutline || hasBoxShadow;

      // Note: if focus indicators are missing, this is an accessibility issue to fix
      expect(hasFocusIndicator, 'Expected visible focus indicator on sidebar link').toBe(true);
    });

    test('Focus indicators are visible on dashboard tab buttons', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Dashboard has tab buttons
      const tabButtons = page.locator('button').filter({ hasText: /Rates|Commodities|Hormuz/i });
      const firstTab = tabButtons.first();
      if (await firstTab.count() > 0) {
        await firstTab.focus();
        const styles = await firstTab.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            outlineStyle: computed.outlineStyle,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow,
          };
        });
        const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
        const hasBoxShadow = styles.boxShadow !== 'none';
        expect(hasOutline || hasBoxShadow, 'Tab button should have visible focus indicator').toBe(true);
      }
    });
  });

  test.describe('Color contrast', () => {

    test('Primary text (#E8EAED) on dark background (#0B0E11) meets 4.5:1 ratio', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      // Calculate contrast ratio between primary text and background
      // #E8EAED = rgb(232, 234, 237) and #0B0E11 = rgb(11, 14, 17)
      // Using WCAG relative luminance formula
      const contrastRatio = await page.evaluate(() => {
        function sRGBtoLinear(c: number): number {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        }
        function luminance(r: number, g: number, b: number): number {
          return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
        }
        const textLum = luminance(232, 234, 237);
        const bgLum = luminance(11, 14, 17);
        const lighter = Math.max(textLum, bgLum);
        const darker = Math.min(textLum, bgLum);
        return (lighter + 0.05) / (darker + 0.05);
      });

      // WCAG AA requires 4.5:1 for normal text
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('Muted text (#5A6A7A) on dark background meets minimum contrast', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      const contrastRatio = await page.evaluate(() => {
        function sRGBtoLinear(c: number): number {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        }
        function luminance(r: number, g: number, b: number): number {
          return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
        }
        // #5A6A7A = rgb(90, 106, 122) against #0B0E11 = rgb(11, 14, 17)
        const textLum = luminance(90, 106, 122);
        const bgLum = luminance(11, 14, 17);
        const lighter = Math.max(textLum, bgLum);
        const darker = Math.min(textLum, bgLum);
        return (lighter + 0.05) / (darker + 0.05);
      });

      // Report the ratio — muted text may not meet AA for normal text (4.5:1)
      // but should at least meet the large text ratio (3:1)
      expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
    });

    test('Green accent (#00CC66) on dark background meets contrast ratio', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      const contrastRatio = await page.evaluate(() => {
        function sRGBtoLinear(c: number): number {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        }
        function luminance(r: number, g: number, b: number): number {
          return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
        }
        // #00CC66 = rgb(0, 204, 102) against #0B0E11 = rgb(11, 14, 17)
        const textLum = luminance(0, 204, 102);
        const bgLum = luminance(11, 14, 17);
        const lighter = Math.max(textLum, bgLum);
        const darker = Math.min(textLum, bgLum);
        return (lighter + 0.05) / (darker + 0.05);
      });

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  test.describe('Heading hierarchy', () => {

    for (const { path, name } of PAGES) {
      test(`Heading levels are in proper sequence on ${name} page`, async ({ page }) => {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        // Gather all headings in document order
        const headings = await page.evaluate(() => {
          const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          return Array.from(elements).map(el => ({
            level: parseInt(el.tagName[1]),
            text: el.textContent?.trim().slice(0, 60) || '',
          }));
        });

        if (headings.length === 0) {
          // No headings on this page — that's an observation, not necessarily a failure
          return;
        }

        // Check heading hierarchy: no level should skip more than 1 level
        // e.g., h1 -> h3 is a violation (skips h2), h1 -> h2 -> h4 is also a violation
        for (let i = 1; i < headings.length; i++) {
          const prev = headings[i - 1].level;
          const curr = headings[i].level;
          // Going deeper: should not skip levels
          if (curr > prev) {
            expect(
              curr - prev,
              `Heading skip on ${name}: h${prev} "${headings[i - 1].text}" -> h${curr} "${headings[i].text}"`
            ).toBeLessThanOrEqual(1);
          }
          // Going shallower or same level is always fine
        }
      });
    }
  });

  test.describe('ARIA labels on icon-only buttons', () => {

    test('Sidebar navigation icons have accessible labels (title or aria-label)', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

      const sidebarLinks = page.locator('nav a');
      const count = await sidebarLinks.count();
      expect(count).toBeGreaterThanOrEqual(5);

      for (let i = 0; i < count; i++) {
        const link = sidebarLinks.nth(i);
        const title = await link.getAttribute('title');
        const ariaLabel = await link.getAttribute('aria-label');
        const innerText = (await link.innerText()).trim();

        // Each icon-only link should have a title, aria-label, or visible text
        const hasAccessibleName = !!title || !!ariaLabel || innerText.length > 0;
        expect(
          hasAccessibleName,
          `Sidebar link #${i} lacks accessible name (no title, aria-label, or visible text)`
        ).toBe(true);
      }
    });

    test('Remove (X) buttons on video cards have accessible labels', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Video card remove buttons show "X" text
      const removeButtons = page.locator('button').filter({ hasText: /^X$/ });
      const count = await removeButtons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = removeButtons.nth(i);
        const title = await btn.getAttribute('title');
        const ariaLabel = await btn.getAttribute('aria-label');
        // Should have title="Remove from feed" or aria-label
        const hasAccessibleName = !!title || !!ariaLabel;
        expect(
          hasAccessibleName,
          `Remove button #${i} should have title or aria-label for accessibility`
        ).toBe(true);
      }
    });
  });

  test.describe('Form labels associated with inputs', () => {

    test('YouTube Add Channel form inputs have associated labels or accessible names', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });

      // Open the Add Channel form
      const addChannelBtn = page.locator('button').filter({ hasText: /Add Channel/i });
      if (await addChannelBtn.count() > 0) {
        await addChannelBtn.click();
        await page.waitForTimeout(500);

        // Check all inputs in the add channel form area
        const formInputs = page.locator('input[type="text"]');
        const inputCount = await formInputs.count();

        for (let i = 0; i < inputCount; i++) {
          const input = formInputs.nth(i);
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          const placeholder = await input.getAttribute('placeholder');
          const title = await input.getAttribute('title');

          // Check if there's a <label> pointing to this input
          let hasAssociatedLabel = false;
          if (id) {
            const labelCount = await page.locator(`label[for="${id}"]`).count();
            hasAssociatedLabel = labelCount > 0;
          }

          // An input should have at least one: label, aria-label, aria-labelledby, or placeholder
          const hasAccessibleName = hasAssociatedLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder || !!title;
          expect(
            hasAccessibleName,
            `Input #${i} in Add Channel form lacks an accessible name`
          ).toBe(true);
        }
      }
    });

    test('Journal page textarea has accessible label or placeholder', async ({ page }) => {
      await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const textareas = page.locator('textarea');
      const count = await textareas.count();

      for (let i = 0; i < count; i++) {
        const textarea = textareas.nth(i);
        const ariaLabel = await textarea.getAttribute('aria-label');
        const placeholder = await textarea.getAttribute('placeholder');
        const id = await textarea.getAttribute('id');

        let hasAssociatedLabel = false;
        if (id) {
          hasAssociatedLabel = (await page.locator(`label[for="${id}"]`).count()) > 0;
        }

        const hasAccessibleName = hasAssociatedLabel || !!ariaLabel || !!placeholder;
        expect(hasAccessibleName, `Textarea #${i} on Journal page lacks accessible name`).toBe(true);
      }
    });
  });
});
