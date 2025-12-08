import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const h3 = page.getByRole('heading', { level: 3 });
      await expect(h3).toBeVisible();
    });

    test('should have accessible form inputs', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/email/i);
      const passwordInput = page.getByPlaceholder(/password/i);

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();

      // Inputs should be focusable
      await emailInput.focus();
      await expect(emailInput).toBeFocused();

      await passwordInput.focus();
      await expect(passwordInput).toBeFocused();
    });

    test('should be navigable by keyboard', async ({ page }) => {
      // Tab through the form
      await page.keyboard.press('Tab');
      await expect(page.getByPlaceholder(/email/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByPlaceholder(/password/i)).toBeFocused();
    });

    test('should have submit button with proper role', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toHaveAttribute('type', 'submit');
    });

    test('links should have proper roles', async ({ page }) => {
      const forgotLink = page.getByRole('link', { name: /forgot password/i });
      const signUpLink = page.getByRole('link', { name: /sign up/i });

      await expect(forgotLink).toBeVisible();
      await expect(signUpLink).toBeVisible();
    });
  });

  test.describe('Register Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register');
    });

    test('should have accessible form inputs', async ({ page }) => {
      await expect(page.getByPlaceholder(/first name/i)).toBeVisible();
      await expect(page.getByPlaceholder(/last name/i)).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toBeVisible();
      await expect(page.getByPlaceholder(/confirm password/i)).toBeVisible();
    });

    test('checkbox should be accessible', async ({ page }) => {
      const checkbox = page.getByRole('checkbox');
      await expect(checkbox).toBeVisible();

      // Should be clickable
      await checkbox.click();
      await expect(checkbox).toBeChecked();

      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
    });

    test('should have associated labels for checkbox', async ({ page }) => {
      const label = page.getByText(/I agree to the/i);
      await expect(label).toBeVisible();
    });
  });

  test.describe('Visual Focus Indicators', () => {
    test('buttons should have visible focus state', async ({ page }) => {
      await page.goto('/auth/login');

      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.focus();

      // Check for focus ring class
      await expect(submitButton).toHaveClass(/focus:ring/);
    });

    test('inputs should have visible focus state', async ({ page }) => {
      await page.goto('/auth/login');

      const emailInput = page.getByPlaceholder(/email/i);
      await emailInput.focus();

      // Input should have focus-visible styles
      await expect(emailInput).toHaveClass(/focus-visible:ring/);
    });
  });

  test.describe('Color Contrast', () => {
    test('error messages should be visible', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByPlaceholder(/email/i).fill('invalid');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Error message should use red color for visibility
      const errorText = page.locator('.text-red-600, .text-red-500');
      await expect(errorText.first()).toBeVisible();
    });
  });
});
