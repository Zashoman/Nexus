import { test, expect } from '@playwright/test';

const BASE = 'https://nexus-xi-ivory.vercel.app';

test.describe('Section 15: File Operations', () => {
  /*
   * The Nexus application does not have a primary file upload feature.
   * Most data ingestion happens through APIs (YouTube refresh, Telegram webhook, etc.).
   * This section covers any export/download functionality that may exist.
   */

  test.describe('Export/download features', () => {

    test.skip('No file upload feature — skip file upload tests', async () => {
      // The Nexus app does not provide file upload UI in its main pages.
      // Data is ingested via API endpoints (YouTube channel feed, Telegram webhook, etc.).
      // Skipping file upload tests as they are not applicable.
    });

    test('Dashboard page does not expose unexpected download links', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Check if any download-type links or buttons exist
      const downloadLinks = page.locator('a[download], a[href$=".csv"], a[href$=".json"], a[href$=".pdf"]');
      const downloadCount = await downloadLinks.count();

      // If download links exist, verify they point to valid resources
      for (let i = 0; i < downloadCount; i++) {
        const href = await downloadLinks.nth(i).getAttribute('href');
        expect(href).not.toBeNull();
        // Verify the link doesn't point to a sensitive internal resource
        expect(href).not.toContain('.env');
        expect(href).not.toContain('credentials');
      }
    });

    test('Real estate page export functionality (if available)', async ({ page }) => {
      await page.goto(`${BASE}/realestate`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Check for any export/download buttons on the real estate page
      const exportButtons = page.locator('button').filter({ hasText: /export|download|csv/i });
      const exportCount = await exportButtons.count();

      if (exportCount === 0) {
        // No export feature on real estate page — this is expected
        test.info().annotations.push({
          type: 'note',
          description: 'No export/download feature found on Real Estate page',
        });
        return;
      }

      // If export buttons exist, verify they are clickable
      for (let i = 0; i < exportCount; i++) {
        await expect(exportButtons.nth(i)).toBeEnabled();
      }
    });

    test('YouTube page does not have unexpected file operations', async ({ page }) => {
      await page.goto(`${BASE}/youtube`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Verify no file input elements exist (no file upload)
      const fileInputs = page.locator('input[type="file"]');
      const fileInputCount = await fileInputs.count();
      expect(fileInputCount, 'YouTube page should not have file upload inputs').toBe(0);
    });

    test('Journal page does not expose raw file download of entries', async ({ page }) => {
      await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Verify no direct file download links for journal entries
      const downloadLinks = page.locator('a[download]');
      const downloadCount = await downloadLinks.count();

      // Journal entries should not be exposed as downloadable files
      // (They are rendered in-page, not as file downloads)
      if (downloadCount > 0) {
        // If any download links exist, verify they are safe
        for (let i = 0; i < downloadCount; i++) {
          const href = await downloadLinks.nth(i).getAttribute('href');
          expect(href).not.toContain('api/journal');
        }
      }
    });
  });

  test.describe('API data export endpoints', () => {

    test('API endpoints return JSON, not file downloads by default', async ({ request }) => {
      // Verify that API endpoints return JSON content type, not file attachments
      const endpoints = [
        '/api/youtube/feed',
        '/api/dashboard/rates',
        '/api/re/stats',
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(`${BASE}${endpoint}`);
        const contentType = response.headers()['content-type'] || '';
        // Should return JSON, not a file download
        expect(contentType).toContain('application/json');

        // Should not have Content-Disposition header (which would trigger download)
        const contentDisposition = response.headers()['content-disposition'];
        expect(contentDisposition).toBeUndefined();
      }
    });
  });
});
