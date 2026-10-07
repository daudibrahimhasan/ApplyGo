import { describe, it, expect } from 'vitest';
import { isRestrictedUrl, isSupportedPage } from '../../src/shared/tabUtils';

describe('tabUtils', () => {
  it('correctly identifies restricted browser URLs', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('chrome://newtab/')).toBe(true);
    expect(isRestrictedUrl('chrome-extension://abcdef/index.html')).toBe(true);
    expect(isRestrictedUrl('edge://settings')).toBe(true);
    expect(isRestrictedUrl('about:blank')).toBe(true);
    expect(isRestrictedUrl('devtools://devtools/bundled/')).toBe(true);
    expect(isRestrictedUrl('')).toBe(true);
    expect(isRestrictedUrl(undefined)).toBe(true);
    expect(isRestrictedUrl(null)).toBe(true);
  });

  it('correctly identifies supported regular application web pages', () => {
    expect(isRestrictedUrl('https://boards.greenhouse.io/anthropic/jobs/123')).toBe(false);
    expect(isRestrictedUrl('http://localhost:3000/apply')).toBe(false);
    expect(isRestrictedUrl('file:///d:/complexApplication.html')).toBe(false);

    expect(isSupportedPage('https://jobs.lever.co/company/job-id')).toBe(true);
    expect(isSupportedPage('http://localhost:8080')).toBe(true);
    expect(isSupportedPage('file:///C:/Users/test/form.html')).toBe(true);
    expect(isSupportedPage('chrome://extensions')).toBe(false);
  });
});
