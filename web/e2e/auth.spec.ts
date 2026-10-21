import { test, expect } from '@playwright/test';

test.describe('Auth Flow (Register & Login)', () => {
  test('navigates to login page and displays required input fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/HuKi|Đăng nhập/i);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test('validates empty credentials on login form', async ({ page }) => {
    await page.goto('/auth/login');

    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show validation error or remain on page
      await expect(page).toHaveURL(/.*\/auth\/login.*/);
    }
  });

  test('navigates to register page and checks registration form elements', async ({ page }) => {
    await page.goto('/auth/register');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test('prevents insecure plaintext password storage in client storage', async ({ page }) => {
    await page.goto('/auth/register');

    // Verify localStorage has no legacy pending passwords
    const pendingPassword = await page.evaluate(() => localStorage.getItem('huki_pending_password'));
    expect(pendingPassword).toBeNull();
  });
});
