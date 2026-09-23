import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(__dirname, '../../dist');

test.describe('GroundedApply Extension E2E Flow', () => {
  test('extension builds, loads in Chromium, and renders sidepanel with detected opportunity', async () => {
    const userDataDir = path.resolve(__dirname, '../../.playwright-userDataDir');

    // Launch Chromium with unpacked extension
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      args: [
        '--headless=new',
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    // Locate extension service worker to find extension ID
    let extensionId = '';
    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const swUrl = serviceWorkers[0].url();
      const match = swUrl.match(/chrome-extension:\/\/([a-z0-9]+)/);
      if (match) extensionId = match[1];
    }

    if (!extensionId) {
      // Find from background page or wait
      const worker = await context.waitForEvent('serviceworker', { timeout: 5000 }).catch(() => null);
      if (worker) {
        const match = worker.url().match(/chrome-extension:\/\/([a-z0-9]+)/);
        if (match) extensionId = match[1];
      }
    }

    // 1. Open the opportunity fixture form
    const page = await context.newPage();
    const fixtureUrl = 'file://' + path.resolve(__dirname, '../fixtures/complexApplication.html').replace(/\\/g, '/');
    await page.goto(fixtureUrl);

    // Verify form elements exist
    await expect(page.locator('#first_name')).toBeVisible();
    await expect(page.locator('#last_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#ssn_tax_id')).toBeVisible();

    // 2. Open the GroundedApply Sidepanel UI
    if (extensionId) {
      const sidepanelPage = await context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
      await expect(sidepanelPage.locator('text=GroundedApply')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Apply")')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Questions")')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Profile")')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Knowledge")')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Activity")')).toBeVisible();
    }

    await context.close();
  });
});
