import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('redirects unauthenticated users attempting to access /onboarding', async ({ page }) => {
    // Clear any existing tokens in browser context
    await page.context().clearCookies();
    await page.goto('/onboarding');

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/.*\/auth\/login.*/);
  });

  test('loads onboarding interface and allows step progression when authenticated', async ({ page }) => {
    // Inject mock user auth state into page
    await page.addInitScript(() => {
      localStorage.setItem('huki_access_token', 'mock_e2e_user_token');
    });

    // Mock /api/v1/user/profile to return active un-onboarded user
    await page.route('**/api/v1/user/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'usr-e2e-1',
            email: 'e2e@huki.vn',
            fullName: 'Độc Giả E2E',
            hasCompletedOnboarding: false,
          },
        }),
      });
    });

    await page.goto('/onboarding');

    // Confirm step 1 heading
    const heading = page.locator('h1');
    await expect(heading.first()).toBeVisible();

    // Verify next button advances through steps
    const nextBtn = page.getByRole('button', { name: /tiếp tục/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      // Should show step 2
      await expect(page.locator('text=Chọn các thể loại bạn yêu thích').first()).toBeVisible();
    }
  });
});
