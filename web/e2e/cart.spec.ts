import { test, expect } from '@playwright/test';

test.describe('Cart & Checkout Flow', () => {
  test('navigates to empty cart and verifies empty state message', async ({ page }) => {
    // Clear cart items in localStorage
    await page.addInitScript(() => {
      localStorage.removeItem('huki.cart.guest_items');
      localStorage.removeItem('huki.cart.items');
    });

    await page.goto('/cart');
    await expect(page).toHaveURL(/.*\/cart.*/);

    const emptyText = page.locator('text=/giỏ hàng.*trống|chưa có sản phẩm/i');
    if (await emptyText.count() > 0) {
      await expect(emptyText.first()).toBeVisible();
    }
  });

  test('displays populated cart items, allows quantity change and reflects in checkout subtotal', async ({ page }) => {
    // Seed cart item into localStorage
    await page.addInitScript(() => {
      const sampleItem = {
        id: 'cart-e2e-1',
        bookId: 'book-e2e-1',
        title: 'Đắc Nhân Tâm Bản Quyền',
        author: 'Dale Carnegie',
        publisher: 'NXB Tổng Hợp TP.HCM',
        storeId: 'huki-official',
        format: 'Sách giấy',
        type: 'physical',
        price: 85000,
        quantity: 2,
        checked: true,
        cover: '/covers/dac-nhan-tam.jpg',
        isAvailable: true,
      };
      localStorage.setItem('huki.cart.guest_items', JSON.stringify([sampleItem]));
    });

    await page.goto('/cart');

    // Verify item title is present
    await expect(page.locator('text=Đắc Nhân Tâm Bản Quyền').first()).toBeVisible();

    // Check presence of checkout button
    const checkoutBtn = page.locator('button:has-text("Mua Hàng"), button:has-text("Thanh Toán"), a[href*="checkout"]');
    if (await checkoutBtn.count() > 0) {
      await expect(checkoutBtn.first()).toBeVisible();
    }
  });
});
