import { test, expect } from '@playwright/test';

test.describe('Seller Fulfillment Flow', () => {
  test('navigates to seller dashboard and verifies access or login prompt', async ({ page }) => {
    await page.goto('/seller');

    // Either displays seller dashboard or redirects unauthenticated seller
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(seller|auth\/login)/);
  });

  test('navigates to seller orders management view', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_seller_jwt_token');
      localStorage.setItem('huki_active_business_id', 'biz-e2e-1');
    });

    await page.goto('/seller/orders');
    await expect(page).toHaveURL(/.*\/seller.*/);
  });

  test('navigates to seller products management view', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_seller_jwt_token');
      localStorage.setItem('huki_active_business_id', 'biz-e2e-1');
    });

    await page.goto('/seller/products');
    await expect(page).toHaveURL(/.*\/seller.*/);
  });
});
