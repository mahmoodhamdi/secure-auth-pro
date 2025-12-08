import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');

test.describe('Screenshots for Portfolio', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  // Auth Pages - Desktop
  test('01 - Login Page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png') });
  });

  test('02 - Register Page', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-register.png') });
  });

  test('03 - Forgot Password Page', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-forgot-password.png') });
  });

  test('04 - Reset Password Page', async ({ page }) => {
    await page.goto('/auth/reset-password?token=demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-reset-password.png') });
  });

  test('05 - Verify Email Page', async ({ page }) => {
    await page.goto('/auth/verify-email?token=demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-verify-email.png') });
  });

  test('06 - Two Factor Page', async ({ page }) => {
    await page.goto('/auth/two-factor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-two-factor.png') });
  });

  // Login with filled form
  test('07 - Login Page with Form Filled', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', '••••••••');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-login-filled.png') });
  });

  // Register with filled form
  test('08 - Register Page with Form Filled', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="First"]', 'John');
    await page.fill('input[placeholder*="Last"]', 'Doe');
    await page.fill('input[type="email"]', 'john.doe@example.com');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-register-filled.png') });
  });

  // Mobile Screenshots
  test('09 - Login Page Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-login-mobile.png') });
  });

  test('10 - Register Page Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-register-mobile.png') });
  });

  // Home/Landing Page
  test('11 - Home Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-home.png') });
  });

  // Dashboard Pages (will redirect to login but shows the flow)
  test('12 - Dashboard Redirect', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-dashboard-redirect.png') });
  });
});
