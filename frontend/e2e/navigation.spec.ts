import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should redirect to login when accessing profile', async ({ page }) => {
      await page.goto('/dashboard/profile');

      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should redirect to login when accessing sessions', async ({ page }) => {
      await page.goto('/dashboard/sessions');

      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should redirect to login when accessing settings', async ({ page }) => {
      await page.goto('/dashboard/settings');

      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should allow access to login page', async ({ page }) => {
      await page.goto('/auth/login');

      await expect(page).toHaveURL(/\/auth\/login/);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should allow access to register page', async ({ page }) => {
      await page.goto('/auth/register');

      await expect(page).toHaveURL(/\/auth\/register/);
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    });

    test('should allow access to forgot password page', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await expect(page).toHaveURL(/\/auth\/forgot-password/);
    });
  });

  test.describe('Page Layouts', () => {
    test('auth pages should have centered card layout', async ({ page }) => {
      await page.goto('/auth/login');

      // Check for card component
      const card = page.locator('.rounded-lg.border.shadow-sm');
      await expect(card).toBeVisible();
    });

    test('auth pages should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');

      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });
  });
});
