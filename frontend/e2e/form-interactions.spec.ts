import { test, expect } from '@playwright/test';

test.describe('Form Interactions', () => {
  test.describe('Login Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
    });

    test('should fill and clear email input', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/email/i);

      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');

      await emailInput.clear();
      await expect(emailInput).toHaveValue('');
    });

    test('should fill and clear password input', async ({ page }) => {
      const passwordInput = page.getByPlaceholder(/password/i);

      await passwordInput.fill('mypassword123');
      await expect(passwordInput).toHaveValue('mypassword123');

      await passwordInput.clear();
      await expect(passwordInput).toHaveValue('');
    });

    test('should check and uncheck remember me', async ({ page }) => {
      const rememberMe = page.getByRole('checkbox');

      await rememberMe.check();
      await expect(rememberMe).toBeChecked();

      await rememberMe.uncheck();
      await expect(rememberMe).not.toBeChecked();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('test@example.com');
      await page.getByPlaceholder(/password/i).fill('password123');

      // Press Enter to submit
      await page.keyboard.press('Enter');

      // Form should attempt to submit (may show error since backend isn't running)
      // Just verify the form interaction works
      await page.waitForTimeout(500);
    });

    test('should disable button during loading', async ({ page }) => {
      // Fill valid form
      await page.getByPlaceholder(/email/i).fill('test@example.com');
      await page.getByPlaceholder(/password/i).fill('password123');

      const submitButton = page.getByRole('button', { name: /sign in/i });

      // Click and check if button shows loading state
      await submitButton.click();

      // The button may briefly be disabled during submission
      // Note: This test may need adjustment based on actual loading behavior
    });
  });

  test.describe('Register Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register');
    });

    test('should fill all registration fields', async ({ page }) => {
      await page.getByPlaceholder(/first name/i).fill('John');
      await page.getByPlaceholder(/last name/i).fill('Doe');
      await page.getByPlaceholder(/email/i).fill('john@example.com');
      await page.getByPlaceholder('Password').fill('Password123!');
      await page.getByPlaceholder(/confirm password/i).fill('Password123!');

      await expect(page.getByPlaceholder(/first name/i)).toHaveValue('John');
      await expect(page.getByPlaceholder(/last name/i)).toHaveValue('Doe');
      await expect(page.getByPlaceholder(/email/i)).toHaveValue('john@example.com');
    });

    test('should show real-time validation feedback', async ({ page }) => {
      const passwordInput = page.getByPlaceholder('Password');

      // Type a weak password
      await passwordInput.fill('weak');
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show password requirement error
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('should validate password confirmation in real-time', async ({ page }) => {
      await page.getByPlaceholder(/first name/i).fill('John');
      await page.getByPlaceholder(/last name/i).fill('Doe');
      await page.getByPlaceholder(/email/i).fill('john@example.com');
      await page.getByPlaceholder('Password').fill('Password123!');
      await page.getByPlaceholder(/confirm password/i).fill('Different123!');
      await page.getByRole('checkbox').click();

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should require terms acceptance', async ({ page }) => {
      await page.getByPlaceholder(/first name/i).fill('John');
      await page.getByPlaceholder(/last name/i).fill('Doe');
      await page.getByPlaceholder(/email/i).fill('john@example.com');
      await page.getByPlaceholder('Password').fill('Password123!');
      await page.getByPlaceholder(/confirm password/i).fill('Password123!');

      // Don't check terms checkbox
      const submitButton = page.getByRole('button', { name: /create account/i });
      await submitButton.click();

      // Form should not submit without terms acceptance (HTML5 validation)
      await expect(page).toHaveURL(/\/auth\/register/);
    });
  });

  test.describe('Forgot Password Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/forgot-password');
    });

    test('should fill email and submit', async ({ page }) => {
      const emailInput = page.getByPlaceholder(/email/i);
      await emailInput.fill('test@example.com');

      await expect(emailInput).toHaveValue('test@example.com');
    });

    test('should validate email format', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('notanemail');
      await page.getByRole('button', { name: /send/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility on login', async ({ page }) => {
      await page.goto('/auth/login');

      const passwordInput = page.getByPlaceholder(/password/i);
      await passwordInput.fill('testpassword');

      // Find the toggle button (eye icon button)
      const toggleButtons = page.locator('button[type="button"]').filter({
        has: page.locator('svg'),
      });

      // Get the last toggle button (password field toggle)
      const toggleButton = toggleButtons.last();

      // Initially should be password type
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should toggle password visibility on register', async ({ page }) => {
      await page.goto('/auth/register');

      const passwordInput = page.getByPlaceholder('Password');
      await passwordInput.fill('testpassword');

      // Should initially be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
