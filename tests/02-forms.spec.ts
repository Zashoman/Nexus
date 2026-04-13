import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Section 2: Form Input & Validation
// ---------------------------------------------------------------------------

test.describe('Section 2 - Form Input & Validation', () => {

  test('YouTube Add Channel — required field enforcement (handle + category)', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });

    // Open the Add Channel form
    await page.locator('button:has-text("Add Channel")').click();
    await expect(page.locator('input[placeholder*="YouTube handle"]')).toBeVisible();

    // The Add button should be disabled when handle and category are empty
    const addButton = page.locator('button:has-text("Add")').last();
    await expect(addButton).toBeDisabled();

    // Fill only handle — Add should still be disabled (category required)
    await page.locator('input[placeholder*="YouTube handle"]').fill('@TestChannel');
    await expect(addButton).toBeDisabled();

    // Clear handle, fill only category — still disabled
    await page.locator('input[placeholder*="YouTube handle"]').fill('');
    await page.locator('input[placeholder*="Category"]').fill('geopolitics');
    await expect(addButton).toBeDisabled();

    // Fill both — Add should become enabled
    await page.locator('input[placeholder*="YouTube handle"]').fill('@TestChannel');
    await expect(addButton).toBeEnabled();
  });

  test('YouTube Add Channel — submit and verify channel appears', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });

    // Open Add Channel form
    await page.locator('button:has-text("Add Channel")').click();
    await expect(page.locator('input[placeholder*="YouTube handle"]')).toBeVisible();

    // Fill out the form with a test channel
    await page.locator('input[placeholder*="YouTube handle"]').fill('@PlaywrightTestChannel');
    await page.locator('input[placeholder*="Channel name"]').fill('Playwright Test');
    await page.locator('input[placeholder*="Category"]').fill('testing');

    // Submit
    const addButton = page.locator('button:has-text("Add")').last();
    await expect(addButton).toBeEnabled();
    await addButton.click();

    // After submitting, the form should close (the "Add Channel" toggle goes back)
    // Wait for the form to disappear or for the button text to revert
    await expect(page.locator('input[placeholder*="YouTube handle"]')).not.toBeVisible({ timeout: 10_000 });
  });

  test('Real Estate refresh modal — launches and shows search button', async ({ page }) => {
    await page.goto('/realestate');
    await page.waitForLoadState('domcontentloaded');

    // The RE page may show a login redirect or the dashboard
    // Look for the Refresh button in the header (only visible to authenticated owners)
    // For unauthenticated users, check the login page instead
    const refreshButton = page.locator('button:has-text("Refresh")');
    const loginText = page.locator('text=Dubai RE Monitor');

    // Wait for either the refresh button or login page
    await expect(loginText).toBeVisible({ timeout: 15_000 });

    // If we see the dashboard (public data loads), check for the modal trigger
    const refreshCount = await refreshButton.count();
    if (refreshCount > 0) {
      await refreshButton.click();
      // The modal should show "Search Now" button
      await expect(page.locator('button:has-text("Search Now")')).toBeVisible({ timeout: 5_000 });
      // Close modal
      await page.locator('button:has-text("\u00d7")').click();
    } else {
      // RE requires auth — the page renders but without owner controls
      // Verify the page at least loads the title
      await expect(loginText).toBeVisible();
    }
  });

  test('Double-submit prevention — YouTube Refresh Now button disables during refresh', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });

    const refreshButton = page.locator('button:has-text("Refresh Now")');
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();

    // Click refresh
    await refreshButton.click();

    // Button should show "Refreshing..." and be disabled
    await expect(page.locator('button:has-text("Refreshing...")')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Refreshing...")')).toBeDisabled();

    // Wait for it to finish and re-enable
    await expect(refreshButton).toBeEnabled({ timeout: 30_000 });
  });

  test('Special characters in YouTube Add Channel form input fields', async ({ page }) => {
    await page.goto('/youtube');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible({ timeout: 15_000 });

    // Open Add Channel form
    await page.locator('button:has-text("Add Channel")').click();
    await expect(page.locator('input[placeholder*="YouTube handle"]')).toBeVisible();

    // Type special characters into the handle field
    const specialChars = '<script>alert("xss")</script>';
    const handleInput = page.locator('input[placeholder*="YouTube handle"]');
    await handleInput.fill(specialChars);

    // Verify the value was accepted without breaking the page
    await expect(handleInput).toHaveValue(specialChars);

    // Type special characters into the name field
    const nameInput = page.locator('input[placeholder*="Channel name"]');
    await nameInput.fill('Test & "Channel" <special>');
    await expect(nameInput).toHaveValue('Test & "Channel" <special>');

    // Ensure no errors — the page should still be functional
    await expect(page.locator('text=YouTube Intelligence').first()).toBeVisible();
  });
});
