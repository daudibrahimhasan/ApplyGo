import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'GroundedApply',
  version: '1.0.0',
  description: 'Deterministic form engine & grounded AI writing assistant for opportunity applications',
  permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
  host_permissions: ['https://*/*', 'http://*/*'],
  action: {
    default_title: 'Open GroundedApply',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
});
