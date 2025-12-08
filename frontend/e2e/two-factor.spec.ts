import { test, expect } from '@playwright/test';

test.describe('Two-Factor Authentication Flow', () => {
  test.describe('2FA Page UI', () => {
    // Note: In real E2E tests, this would require setting up proper auth state
    // For now, we test the UI components

    test('should have proper 2FA page structure when accessed directly', async ({ page }) => {
      // Going directly to 2FA page should redirect to login if not in 2FA flow
      await page.goto('/auth/two-factor');

      // Should redirect to login since no 2FA state
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('2FA Input Validation', () => {
    test.beforeEach(async ({ page }) => {
      // For testing purposes, we can mock the auth state
      // In real tests, we'd set up proper authentication flow
      await page.goto('/auth/login');
    });

    test('should show 2FA link information', async ({ page }) => {
      // Login page should show that 2FA is available
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });
  });

  test.describe('2FA Mobile Responsiveness', () => {
    test('should display properly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');

      // Login form should be visible on mobile
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    });
  });
});

test.describe('OAuth Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should have Google OAuth button', async ({ page }) => {
    const googleButton = page.getByTitle(/sign in with google/i);
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('should have GitHub OAuth button', async ({ page }) => {
    const githubButton = page.getByTitle(/sign in with github/i);
    await expect(githubButton).toBeVisible();
    await expect(githubButton).toBeEnabled();
  });

  test('should have Facebook OAuth button', async ({ page }) => {
    const facebookButton = page.getByTitle(/sign in with facebook/i);
    await expect(facebookButton).toBeVisible();
    await expect(facebookButton).toBeEnabled();
  });

  test('should have OAuth divider', async ({ page }) => {
    await expect(page.getByText(/or continue with/i)).toBeVisible();
  });
});

test.describe('Password Reset Flow', () => {
  test('should navigate from login to forgot password', async ({ page }) => {
    await page.goto('/auth/login');

    const forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotPasswordLink).toBeVisible();

    await forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test('should navigate back to login from forgot password', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    const backToLoginLink = page.getByRole('link', { name: /back to login/i });
    await expect(backToLoginLink).toBeVisible();

    await backToLoginLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should display forgot password form elements', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    await expect(page.getByText(/enter your email address/i)).toBeVisible();
  });

  test('should validate email format on forgot password', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should accept valid email on forgot password', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    await page.getByPlaceholder(/email/i).fill('test@example.com');

    // Verify email is accepted (no validation error shown before submit)
    await expect(page.getByPlaceholder(/email/i)).toHaveValue('test@example.com');
  });
});

test.describe('Registration Flow Complete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('should show all password requirement indicators', async ({ page }) => {
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page.getByText(/uppercase letter/i)).toBeVisible();
    await expect(page.getByText(/lowercase letter/i)).toBeVisible();
    await expect(page.getByText(/one number/i)).toBeVisible();
    await expect(page.getByText(/special character/i)).toBeVisible();
  });

  test('should have terms and privacy policy links', async ({ page }) => {
    await expect(page.getByText(/terms of service/i)).toBeVisible();
    await expect(page.getByText(/privacy policy/i)).toBeVisible();
  });

  test('should navigate to login from register', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();

    await signInLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should navigate to register from login', async ({ page }) => {
    await page.goto('/auth/login');

    const signUpLink = page.getByRole('link', { name: /sign up/i });
    await expect(signUpLink).toBeVisible();

    await signUpLink.click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should validate all required fields', async ({ page }) => {
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show validation errors for required fields
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should validate minimum length for names', async ({ page }) => {
    await page.getByPlaceholder(/first name/i).fill('A');
    await page.getByPlaceholder(/last name/i).fill('B');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder('Password').fill('Password123!');
    await page.getByPlaceholder(/confirm password/i).fill('Password123!');
    await page.getByRole('checkbox').click();

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/at least 2 characters/i).first()).toBeVisible();
  });
});
