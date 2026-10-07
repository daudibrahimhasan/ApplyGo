import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Capture the actual built extension with a fictional local application.
// No external website, API key, or personal browser profile is used.
const extension = path.resolve('dist');
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 720 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).hostname;
  const form = await context.newPage();
  await form.route('http://localhost:43219/showcase', (route) => route.fulfill({
    contentType: 'text/html', body: `<h1>Research Engineering Fellowship</h1><form>
      <label>Full name<input id="name"></label>
      <label>Email<input id="email" type="email"></label>
      <label>GitHub<input id="github"></label>
      <label>Why are you interested in this fellowship?<textarea id="essay"></textarea></label>
      <label>Phone number<input type="tel"></label>
    </form>`,
  }));
  const profile = {
    personal: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    links: { github: 'https://github.com/example-candidate', other: [] },
  };
  await worker.evaluate(async (profile) => chrome.storage.local.set({ grounded_apply_profile: profile }), profile);
  await form.goto('http://localhost:43219/showcase');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
  await form.bringToFront();
  await form.locator('#name').waitFor();
  await panel.getByText('Research Engineering Fellowship', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Generate & Fill', exact: true }).waitFor();
  await panel.evaluate(() => document.fonts.ready);
  await panel.getByText('Reading your form', { exact: true }).waitFor({ state: 'hidden' });
  await panel.getByText('Preparing your answers', { exact: true }).waitFor({ state: 'hidden' });
  fs.mkdirSync('docs/images', { recursive: true });
  await panel.screenshot({ path: 'docs/images/applygo-ui.png' });
  console.log('Saved actual ApplyGo UI: docs/images/applygo-ui.png (1280 × 720, fictional data).');
} finally {
  await context.close();
}
