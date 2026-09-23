import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    headless: false, // Extensions only work in Chromium headful mode or new headless
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    },
  },
});
