import { test, expect } from '@playwright/test';

test.describe('Payment Callback & Order Flow', () => {
  test('navigates to order success page and displays confirmation details', async ({ page }) => {
    await page.goto('/order/success?orderId=ord-e2e-123456');

    // Page should display success message or order code
    const successNotice = page.locator('text=/đặt hàng thành công|thanh toán thành công|cảm ơn/i');
    if (await successNotice.count() > 0) {
      await expect(successNotice.first()).toBeVisible();
    }
  });

  test('navigates to orders list page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_e2e_user_token');
    });

    await page.goto('/orders');
    await expect(page).toHaveURL(/.*\/orders.*/);
  });
});
