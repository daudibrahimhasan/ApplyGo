import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(__dirname, '../../dist');

test.describe('ApplyGo Extension E2E Flow', () => {
  test('extension builds, loads in Chromium, and renders sidepanel with detected opportunity', async () => {
    const userDataDir = path.resolve(__dirname, '../../.playwright-userDataDir');

    // Launch Chromium with unpacked extension
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
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

    expect(extensionId).toBeTruthy();
    // 1. Open the opportunity fixture form
    const page = await context.newPage();
    const fixtureUrl = 'file://' + path.resolve(__dirname, '../fixtures/complexApplication.html').replace(/\\/g, '/');
    await page.goto(fixtureUrl);

    // Verify form elements exist
    await expect(page.locator('#first_name')).toBeVisible();
    await expect(page.locator('#last_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#ssn_tax_id')).toBeVisible();

      // 2. Open the ApplyGo Sidepanel UI
    expect(extensionId).toBeTruthy();
    if (extensionId) {
      const sidepanelPage = await context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
      await expect(sidepanelPage.locator('text=ApplyGo')).toBeVisible();
      await expect(sidepanelPage.locator('.ocean-brand img')).toBeVisible();
      expect(await sidepanelPage.locator('.ocean-brand img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(sidepanelPage.locator('button:has-text("Apply")')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Questions")')).toBeVisible();
      await expect(sidepanelPage.getByRole('button', { name: 'Profile', exact: true })).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Knowledge")')).toBeVisible();
      await expect(sidepanelPage.locator('button:has-text("Activity")')).toBeVisible();

      // Open Settings Modal
      const settingsBtn = sidepanelPage.locator('button[aria-label="Open settings"]');
      await expect(settingsBtn).toBeVisible();
      await settingsBtn.click();

      // Verify API Key Configuration in UI
      await expect(sidepanelPage.getByText('OpenAI-Compatible API Key', { exact: true })).toBeVisible();
      const apiKeyInput = sidepanelPage.getByPlaceholder('Paste API Key (e.g. AIzaSy... or sk-...)');
      await expect(apiKeyInput).toBeVisible();
      await apiKeyInput.fill('sk-test-key-12345');
      await expect(sidepanelPage.locator('button:has-text("Save Settings")')).toBeVisible();

      // Verify Markdown Upload Option in Settings UI
      await expect(sidepanelPage.locator('text=Grounded Knowledge Base (.md)')).toBeVisible();
      await expect(sidepanelPage.locator('text=Choose Markdown File (.md)')).toBeVisible();

      // Test Knowledge Tab has Import .md button as well
      await sidepanelPage.getByRole('button', { name: 'Close settings' }).click();
      await sidepanelPage.locator('button:has-text("Knowledge")').click();
      await expect(sidepanelPage.getByText('Import .md', { exact: true })).toBeVisible();
    }

    await context.close();
  });

  test('gracefully handles browser internal or empty pages without connection errors', async () => {
    const userDataDir = path.resolve(__dirname, '../../.playwright-userDataDir-restricted');

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        '--headless=new',
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    let extensionId = '';
    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const swUrl = serviceWorkers[0].url();
      const match = swUrl.match(/chrome-extension:\/\/([a-z0-9]+)/);
      if (match) extensionId = match[1];
    }

    if (!extensionId) {
      const worker = await context.waitForEvent('serviceworker', { timeout: 5000 }).catch(() => null);
      if (worker) {
        const match = worker.url().match(/chrome-extension:\/\/([a-z0-9]+)/);
        if (match) extensionId = match[1];
      }
    }

    if (extensionId) {
      const sidepanelPage = await context.newPage();
      const pageErrors: string[] = [];
      sidepanelPage.on('pageerror', (err) => pageErrors.push(err.message));

      await sidepanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
      await expect(sidepanelPage.locator('text=ApplyGo')).toBeVisible();

      // A restricted tab should show guidance, never an endless analyzing state.
      await expect(sidepanelPage.locator('.ocean-waiting')).toBeVisible();
      await expect(sidepanelPage.getByText('Analyzing complete form')).toHaveCount(0);
      for (const width of [375, 768, 1440]) {
        await sidepanelPage.setViewportSize({ width, height: 900 });
        await sidepanelPage.evaluate(() => document.fonts.ready);
        const overflow = await sidepanelPage.evaluate(() =>
          document.documentElement.scrollWidth > window.innerWidth
        );
        expect(overflow).toBe(false);
        await sidepanelPage.screenshot({ path: `test-results/ocean-panel-${width}.png` });
      }

      // Ensure no uncaught exceptions occurred
      expect(pageErrors.length).toBe(0);
    }

    await context.close();
  });
});
