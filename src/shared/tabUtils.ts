/**
 * Helper to determine if a URL is a browser-restricted page where
 * content scripts cannot run (e.g. chrome://, edge://, devtools://, etc.)
 */
export function isRestrictedUrl(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.trim().toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('view-source:') ||
    lower.startsWith('about:') ||
    lower.startsWith('data:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('brave://') ||
    lower.startsWith('opera://')
  );
}

/**
 * Checks if a tab is a standard web or local document page
 * that ApplyGo can interact with.
 */
export function isSupportedPage(url?: string | null): boolean {
  if (!url) return false;
  if (isRestrictedUrl(url)) return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('file:///')
  );
}
