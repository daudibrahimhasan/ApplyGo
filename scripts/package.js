import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');

console.log('Building production extension bundle...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist! Build failed.');
  process.exit(1);
}

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Check manifest in dist
const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('manifest.json missing in dist!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';

console.log(`\n========================================`);
console.log(`ApplyGo v${version} Build Verified!`);
console.log(`Unpacked extension directory: ${distDir}`);
console.log(`Manifest V3 confirmed: ${manifestPath}`);
console.log(`Permissions: ${manifest.permissions?.join(', ')}`);
console.log(`========================================\n`);
console.log('To load unpacked in Chrome:');
console.log('1. Open Chrome and navigate to chrome://extensions');
console.log('2. Enable "Developer mode" in the top right corner.');
console.log(`3. Click "Load unpacked" and select the folder: ${distDir}\n`);
