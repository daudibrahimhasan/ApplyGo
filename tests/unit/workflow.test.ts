import { describe, expect, it } from 'vitest';
import { isBasicAutofill, isWrittenQuestion } from '../../src/core/matching/workflow';
import { readFieldValue } from '../../src/content/fieldValue';
import { DetectedField } from '../../src/shared/schemas/fields';

const field = { visibility: true, disabled: false, currentValue: '', sensitivity: 'safe',
  confidence: 'high', proposedProfileKey: 'personal.email', proposedValue: 'alice@example.com',
  inputType: 'textarea', label: 'Email' } as DetectedField;

describe('two-stage workflow', () => {
  it('fills known contact details locally, including textarea-rendered Airtable email', () => {
    expect(isBasicAutofill(field)).toBe(true);
    expect(isWrittenQuestion(field)).toBe(false);
  });
  it('never auto-fills missing, sensitive, uncertain or already entered details', () => {
    expect(isBasicAutofill({ ...field, proposedValue: undefined })).toBe(false);
    expect(isBasicAutofill({ ...field, confidence: 'medium' })).toBe(false);
    expect(isBasicAutofill({ ...field, currentValue: 'my@example.com' })).toBe(false);
    expect(isBasicAutofill({ ...field, proposedProfileKey: 'authorization.ukVisa' })).toBe(false);
  });
  it('only sends prose fields to the writing model', () => {
    const question = { ...field, proposedProfileKey: undefined, label: 'Why are you interested?' };
    expect(isWrittenQuestion(question)).toBe(true);
    expect(isWrittenQuestion({ ...question, inputType: 'select' })).toBe(false);
    expect(isWrittenQuestion({ ...question, inputType: 'radio' })).toBe(false);
    expect(isWrittenQuestion({ ...question, label: 'Email address' })).toBe(false);
  });
  it('reads radio checked state and placeholder dropdowns as empty', () => {
    document.body.innerHTML = '<input type="radio" name="attend" value="yes"><select><option value="placeholder">Select...</option><option value="yes">Yes</option></select>';
    expect(readFieldValue(document.querySelector('input')!)).toBe('');
    expect(readFieldValue(document.querySelector('select')!)).toBe('');
    document.querySelector('input')!.checked = true;
    document.querySelector('select')!.value = 'yes';
    expect(readFieldValue(document.querySelector('input')!)).toBe('yes');
    expect(readFieldValue(document.querySelector('select')!)).toBe('yes');
  });
});
