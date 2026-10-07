import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('GA launcher opens a real side-panel context and displays opening failures', async () => {
  const extension = path.resolve('dist');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.route('http://localhost:43219/launcher', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body><label>Name<input></label></body></html>' }));
    await page.goto('http://localhost:43219/launcher');
    const launcher = page.getByRole('button', { name: 'Open ApplyGo side panel', exact: true });
    await expect(launcher).toHaveText('');
    await expect(launcher.locator('img')).toBeVisible();
    expect(await launcher.locator('img').evaluate((img) => getComputedStyle(img).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await launcher.click();
    await expect(launcher).toHaveAttribute('data-open-state', 'opened');
    await expect.poll(() => worker.evaluate(async () => {
      const panels = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.SIDE_PANEL] });
      return panels.length;
    })).toBeGreaterThan(0);
    await launcher.screenshot({ path: 'test-results/ga-launcher.png' });

    await worker.evaluate(() => {
      chrome.sidePanel.open = async () => { throw new Error('Simulated panel rejection'); };
    });
    await launcher.click();
    await expect(launcher).toHaveAttribute('data-open-state', 'failed');
    await expect(page.getByRole('alert')).toContainText('Simulated panel rejection');
  } finally {
    await context.close();
  }
});
