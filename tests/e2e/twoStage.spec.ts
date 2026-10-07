import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { defaultProfile } from '../../src/shared/storage/defaultProfile';

test('KB basics fill locally; written answers wait for Generate & Fill', async () => {
  const extension = path.resolve('dist');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).hostname;
    expect(extensionId).toBeTruthy();
    await worker.evaluate(async (profile) => {
      await chrome.storage.local.clear();
      await chrome.storage.local.set({
        grounded_apply_profile: { ...profile, education: [{ id: 'old-import-bug', school: 'BRAC', degree: '', fieldOfStudy: '', current: true, achievements: [] }] },
        grounded_apply_knowledge: [{
          id: 'contact', category: 'Background', title: 'Contact details',
          canonicalFacts: [],
          longVersion: '**Name:** Alice Smith\n**Country:** Bangladesh\n**University:** BRAC University\n**Degree:** BSc in Computer Science and Engineering\n**Email:** alice@example.com\n**LinkedIn URL:** https://linkedin.com/in/alice\n**GitHub URL:** https://github.com/alice\nI build AI safety evaluations.',
          tags: [], relatedSkills: [], opportunityTypes: [], evidence: [],
          sensitivity: 'personal', allowAIUse: true,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }],
        grounded_apply_settings: { apiKey: 'test-key', baseUrl: 'https://api.example.test/v1', model: 'test-model' },
      });
      const globals = globalThis as typeof globalThis & { aiCalls: number };
      globals.aiCalls = 0;
      globals.fetch = async () => {
        globals.aiCalls++;
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
          answer: 'I build AI safety evaluations and want to improve how I test agent behavior.',
          confidence: 'high', usedKnowledgeIds: ['contact'], unsupportedClaims: [], missingInformation: [],
        }) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };
    }, defaultProfile);
    const form = await context.newPage();
    await form.route('http://localhost:43219/application', (route) => route.fulfill({
      contentType: 'text/html', body: `<html><body><h1>AI safety application</h1><form>
        <div role="listitem"><div><div role="heading" aria-level="3">Full Name : *</div></div><div><div><input id="name" type="text"></div></div></div>
        <div role="listitem"><div id="email-title" role="heading">Email Address :</div><span id="email-required">*</span><input id="email" type="text" aria-labelledby="email-title email-required"></div>
        <div><h3>LinkedIn</h3><div><div><input id="linkedin"></div></div></div>
        <label for="github">GitHub</label><input id="github">
        <label for="phone">Phone</label><input id="phone" type="tel">
        <label for="city">City</label><input id="city" value="My own city">
        <label for="essay">Why are you interested in AI safety?</label><textarea id="essay"></textarea>
        <label for="availability">Can you attend?</label><select id="availability"><option value="placeholder">Select...</option><option>Yes</option></select>
        <button type="submit">Submit</button></form></body></html>`,
    }));
    await form.goto('http://localhost:43219/application');
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
    await form.bringToFront();
    await expect(form.locator('#name')).toHaveValue('Alice Smith');
    await expect.poll(() => form.evaluate(() => {
      const img = document.querySelector('#grounded-apply-launcher-host')?.shadowRoot?.querySelector('img');
      return Boolean(img?.complete && img.naturalWidth > 0);
    })).toBe(true);
    await expect(form.locator('#email')).toHaveValue('alice@example.com');
    await expect(form.locator('#linkedin')).toHaveValue('https://linkedin.com/in/alice');
    await expect(form.locator('#github')).toHaveValue('https://github.com/alice');
    const recovered = await worker.evaluate(async () => {
      const saved = await chrome.storage.local.get(['grounded_apply_profile', 'grounded_apply_profile_recovery_backup']);
      return { name: saved.grounded_apply_profile.personal.firstName,
        educationCount: saved.grounded_apply_profile.education.length,
        hasRecoveryBackup: Boolean(saved.grounded_apply_profile_recovery_backup) };
    });
    expect(recovered).toEqual({ name: 'Alice', educationCount: 1, hasRecoveryBackup: true });
    await expect(form.locator('#phone')).toHaveValue('');
    await expect(form.locator('#city')).toHaveValue('My own city');
    await expect(form.locator('#essay')).toHaveValue('');
    // Async/multi-step forms can reveal basic controls after the initial scan.
    await form.evaluate(() => {
      document.querySelector('form')!.insertAdjacentHTML('beforeend',
        '<label for="first_name">First name</label><input id="first_name">');
    });
    await expect(form.locator('#first_name')).toHaveValue('Alice');
    expect(await worker.evaluate(() => (globalThis as typeof globalThis & { aiCalls: number }).aiCalls)).toBe(0);
    const generate = panel.getByRole('button', { name: 'Generate & Fill', exact: true });
    await expect(generate).toBeEnabled();
    // Dispatch without activating the panel's test-only browser tab.
    await generate.evaluate((button: HTMLButtonElement) => button.click());
    await expect(form.locator('#essay')).toHaveValue('I build AI safety evaluations and want to improve how I test agent behavior.');
    expect(await worker.evaluate(() => (globalThis as typeof globalThis & { aiCalls: number }).aiCalls)).toBe(1);
    await expect(form.locator('#availability')).toHaveValue('placeholder');
    await expect(form.locator('#city')).toHaveValue('My own city');
    await expect(form.locator('button[type="submit"]')).toBeVisible();

    // Provider failure must not undo local facts or pretend a written answer was filled.
    await form.locator('#essay').fill('');
    await worker.evaluate(() => {
      globalThis.fetch = async () => new Response('Simulated provider failure', { status: 400 });
    });
    await panel.getByRole('button', { name: 'Rescan form' }).evaluate((button: HTMLButtonElement) => button.click());
    await expect(generate).toBeEnabled();
    await generate.evaluate((button: HTMLButtonElement) => button.click());
    await expect(panel.getByText(/API error 400/)).toBeVisible();
    await expect(form.locator('#essay')).toHaveValue('');
    await expect(form.locator('#email')).toHaveValue('alice@example.com');
  } finally {
    await context.close();
  }
});
