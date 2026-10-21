import { test, expect } from '@playwright/test';

test.describe('Catalog & Book Detail Flow', () => {
  test('navigates to books catalog and displays book list or categories', async ({ page }) => {
    await page.goto('/books');

    // Check presence of books container or search filters
    await expect(page).toHaveURL(/.*\/books.*/);
    const mainContent = page.locator('main, section, div');
    await expect(mainContent.first()).toBeVisible();
  });

  test('navigates to a book detail page and verifies book details', async ({ page }) => {
    await page.goto('/book/con-duong-phia-truoc');

    // Page should display book title, price or action buttons
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();

    // Verify format selection buttons or buy buttons
    const actionArea = page.locator('button');
    expect(await actionArea.count()).toBeGreaterThan(0);
  });
});
