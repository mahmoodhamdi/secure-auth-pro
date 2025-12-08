const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function takeScreenshots() {
  const screenshotsDir = path.join(__dirname, '../../docs/screenshots');

  // Ensure directory exists
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:3000';

  console.log('Taking screenshots...');

  try {
    // 1. Login page
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-login.png'), fullPage: false });
    console.log('1. Login page captured');

    // 2. Register page
    await page.goto(`${baseUrl}/auth/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '02-register.png'), fullPage: false });
    console.log('2. Register page captured');

    // 3. Forgot password page
    await page.goto(`${baseUrl}/auth/forgot-password`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '03-forgot-password.png'), fullPage: false });
    console.log('3. Forgot password page captured');

    // 4. Home page
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '04-home.png'), fullPage: false });
    console.log('4. Home page captured');

    // 5. Login page with form filled
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', '********');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '05-login-filled.png'), fullPage: false });
    console.log('5. Login filled captured');

    // 6. Register page with form filled
    await page.goto(`${baseUrl}/auth/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="First name"]', 'John');
    await page.fill('input[placeholder="Last name"]', 'Doe');
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[placeholder="Password"]', 'SecurePass123!');
    await page.fill('input[placeholder="Confirm password"]', 'SecurePass123!');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '06-register-filled.png'), fullPage: false });
    console.log('6. Register filled captured');

    // Mobile viewport screenshots
    await page.setViewportSize({ width: 375, height: 812 });

    // 7. Login mobile
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '07-login-mobile.png'), fullPage: false });
    console.log('7. Login mobile captured');

    // 8. Register mobile
    await page.goto(`${baseUrl}/auth/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '08-register-mobile.png'), fullPage: false });
    console.log('8. Register mobile captured');

    console.log('\nAll screenshots captured successfully!');
    console.log(`Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('Error taking screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
