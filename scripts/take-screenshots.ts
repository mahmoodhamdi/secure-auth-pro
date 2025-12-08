import { chromium, Browser, Page } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:3000';

interface ScreenshotConfig {
  name: string;
  path: string;
  viewport?: { width: number; height: number };
  actions?: (page: Page) => Promise<void>;
}

const pages: ScreenshotConfig[] = [
  // Auth Pages
  {
    name: '01-login',
    path: '/auth/login',
  },
  {
    name: '02-login-mobile',
    path: '/auth/login',
    viewport: { width: 375, height: 812 },
  },
  {
    name: '03-register',
    path: '/auth/register',
  },
  {
    name: '04-register-mobile',
    path: '/auth/register',
    viewport: { width: 375, height: 812 },
  },
  {
    name: '05-forgot-password',
    path: '/auth/forgot-password',
  },
  {
    name: '06-reset-password',
    path: '/auth/reset-password?token=demo-token',
  },
  {
    name: '07-verify-email',
    path: '/auth/verify-email?token=demo-token',
  },
  {
    name: '08-two-factor',
    path: '/auth/two-factor',
  },
  // Home Page
  {
    name: '00-home',
    path: '/',
  },
];

async function takeScreenshots() {
  console.log('Starting screenshot capture...\n');

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const config of pages) {
    const page = await context.newPage();

    // Set viewport if specified
    if (config.viewport) {
      await page.setViewportSize(config.viewport);
    } else {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    try {
      console.log(`📸 Capturing: ${config.name} (${config.path})`);

      await page.goto(`${BASE_URL}${config.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for any animations to complete
      await page.waitForTimeout(1000);

      // Execute custom actions if provided
      if (config.actions) {
        await config.actions(page);
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${config.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      console.log(`   ✅ Saved: ${config.name}.png`);
    } catch (error) {
      console.log(`   ❌ Failed: ${config.name} - ${error}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✨ Screenshot capture complete!');
}

takeScreenshots().catch(console.error);
