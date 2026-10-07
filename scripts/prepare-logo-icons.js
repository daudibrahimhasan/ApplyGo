import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Derive Chrome's PNG sizes from the approved, cropped logo without redrawing it.
const source = path.resolve('public/branding/logo.png');
const dataUrl = `data:image/png;base64,${fs.readFileSync(source).toString('base64')}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const dir = path.resolve('public/icons');
  fs.mkdirSync(dir, { recursive: true });
  for (const size of [16, 48, 128]) {
    const png = await page.evaluate(async ({ dataUrl, size }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      const scale = Math.min(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { dataUrl, size });
    fs.writeFileSync(path.join(dir, `icon${size}.png`), Buffer.from(png, 'base64'));
  }
} finally {
  await browser.close();
}
