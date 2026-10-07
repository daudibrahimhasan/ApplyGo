import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractFieldSignals } from '../../src/content/signals';
import { scanPageForFields } from '../../src/content/scanner';
import { fillFields } from '../../src/content/filler';
import { defaultProfile } from '../../src/shared/storage/defaultProfile';
import { isBasicAutofill } from '../../src/core/matching/workflow';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.stubGlobal('CSS', { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&') });
});

function signals(markup: string) {
  document.body.innerHTML = markup;
  return extractFieldSignals(document.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [contenteditable]')!);
}

describe('form label detection across layouts', () => {
  it('resolves multiple ARIA label and description IDs', () => {
    const result = signals('<span id="q">Full Name :</span><span id="required">*</span><span id="help">Use your legal name.</span><span id="limit">Max 50 characters</span><input aria-labelledby="q required" aria-describedby="help limit">');
    expect(result.label).toBe('Full Name');
    expect(result.ariaDescription).toBe('Use your legal name. Max 50 characters');
    expect(result.characterLimit).toBe(50);
  });
  it('reads Google Forms headings even without descriptive CSS classes', () => {
    expect(signals('<div role="listitem"><div><div role="heading" aria-level="3">Email Address : *</div></div><div><div><input type="text"></div></div></div>').label).toBe('Email Address');
  });
  it('uses native labels before unrelated nearby titles', () => {
    expect(signals('<div class="field"><h3>Contact information</h3><label for="e">Email</label><input id="e"></div>').label).toBe('Email');
  });
  it('reads deeply nested generic headings without platform-specific class names', () => {
    expect(signals('<div class="x"><h3>LinkedIn</h3><div><div><input></div></div></div>').label).toBe('LinkedIn');
  });
  it('reads preceding sibling labels and direct text labels', () => {
    expect(signals('<div><span>Phone Number *</span><input></div>').label).toBe('Phone Number');
    expect(signals('<div>First name <input></div>').label).toBe('First name');
  });
  it('does not borrow a title from another field in the form', () => {
    expect(signals('<form><div><label for="other">Email</label><input id="other" type="hidden"></div><div><input id="target"></div></form>').label).toBe('');
  });
  it('keeps generic placeholder text from being treated as a question', () => {
    expect(signals('<div><span>Your answer</span><input></div>').label).toBe('');
  });
  it('recognizes editable custom textboxes and ignores read-only inputs', () => {
    document.body.innerHTML = '<div><span>Email</span><div id="editor" role="textbox" contenteditable="true"></div></div><input readonly aria-label="Full name">';
    const fields = scanPageForFields(defaultProfile).fields;
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('Email');
    expect(fields[0].inputType).toBe('textarea');
  });
  it('flags unidentified fields for review instead of pretending they are ready', () => {
    document.body.innerHTML = '<input id="unknown">';
    const field = scanPageForFields(defaultProfile).fields[0];
    expect(field.fillState).toBe('review');
    expect(field.matchReason).toContain('question label could not be read');
  });
  it('matches and fills Google Forms-style controls from saved profile facts', async () => {
    document.body.innerHTML = '<div role="listitem"><div role="heading">Full Name : *</div><div><input id="name" type="text"></div></div><div role="listitem"><div role="heading">Email Address : *</div><div><input id="email" type="text"></div></div>';
    const profile = { ...defaultProfile, personal: { ...defaultProfile.personal, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' } };
    const fields = scanPageForFields(profile).fields;
    expect(fields.every(isBasicAutofill)).toBe(true);
    const result = await fillFields(fields.map((field) => ({ id: field.id, selector: field.selector, value: field.proposedValue! })), 0);
    expect(result.successCount).toBe(2);
    expect(document.querySelector<HTMLInputElement>('#name')!.value).toBe('Alice Smith');
    expect(document.querySelector<HTMLInputElement>('#email')!.value).toBe('alice@example.com');
  });
  it('fills an editable custom textbox and reads back its value', async () => {
    document.body.innerHTML = '<div><span>Email</span><div id="editor" role="textbox" contenteditable="true"></div></div>';
    const result = await fillFields([{ id: 'editor', selector: '#editor', value: 'alice@example.com' }], 0);
    expect(result.successCount).toBe(1);
    expect(scanPageForFields(defaultProfile).fields[0].currentValue).toBe('alice@example.com');
  });
});
