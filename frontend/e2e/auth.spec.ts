import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
    });

    test('should display login page correctly', async ({ page }) => {
      await expect(page).toHaveTitle(/SecureAuth/i);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();

      // Form should not submit without valid input
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('invalid-email');
      await page.getByPlaceholder(/password/i).fill('password123');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      const forgotLink = page.getByRole('link', { name: /forgot password/i });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();
      await expect(page).toHaveURL(/\/auth\/forgot-password/);
    });

    test('should have sign up link', async ({ page }) => {
      const signUpLink = page.getByRole('link', { name: /sign up/i });
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await expect(page).toHaveURL(/\/auth\/register/);
    });

    test('should have OAuth buttons', async ({ page }) => {
      await expect(page.getByTitle(/sign in with google/i)).toBeVisible();
      await expect(page.getByTitle(/sign in with github/i)).toBeVisible();
      await expect(page.getByTitle(/sign in with facebook/i)).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.getByPlaceholder(/password/i);
      await passwordInput.fill('testpassword');

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle button
      await page.getByRole('button').filter({ has: page.locator('svg') }).last().click();

      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  test.describe('Register Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register');
    });

    test('should display registration page correctly', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
      await expect(page.getByPlaceholder(/first name/i)).toBeVisible();
      await expect(page.getByPlaceholder(/last name/i)).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toBeVisible();
      await expect(page.getByPlaceholder(/confirm password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('should show password requirements', async ({ page }) => {
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
      await expect(page.getByText(/uppercase letter/i)).toBeVisible();
      await expect(page.getByText(/lowercase letter/i)).toBeVisible();
      await expect(page.getByText(/one number/i)).toBeVisible();
      await expect(page.getByText(/special character/i)).toBeVisible();
    });

    test('should have terms checkbox', async ({ page }) => {
      const termsCheckbox = page.getByRole('checkbox');
      await expect(termsCheckbox).toBeVisible();
      await expect(page.getByText(/terms of service/i)).toBeVisible();
      await expect(page.getByText(/privacy policy/i)).toBeVisible();
    });

    test('should have sign in link', async ({ page }) => {
      const signInLink = page.getByRole('link', { name: /sign in/i });
      await expect(signInLink).toBeVisible();
      await signInLink.click();
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should show validation errors for incomplete form', async ({ page }) => {
      await page.getByPlaceholder(/first name/i).fill('J');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
    });

    test('should show password mismatch error', async ({ page }) => {
      await page.getByPlaceholder(/first name/i).fill('John');
      await page.getByPlaceholder(/last name/i).fill('Doe');
      await page.getByPlaceholder(/email/i).fill('john@example.com');
      await page.getByPlaceholder('Password').fill('Password123!');
      await page.getByPlaceholder(/confirm password/i).fill('DifferentPassword123!');
      await page.getByRole('checkbox').click();
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/forgot-password');
    });

    test('should display forgot password page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    });

    test('should have back to login link', async ({ page }) => {
      const backLink = page.getByRole('link', { name: /back to login/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /send reset link/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });
  });
});
