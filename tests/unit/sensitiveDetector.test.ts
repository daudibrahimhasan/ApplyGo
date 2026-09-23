import { describe, it, expect } from 'vitest';
import { evaluateFieldSensitivity } from '../../src/core/security/sensitiveDetector';

describe('sensitiveDetector', () => {
  it('blocks password inputs by type', () => {
    const res = evaluateFieldSensitivity({ type: 'password' });
    expect(res.isBlocked).toBe(true);
    expect(res.category).toBe('password');
  });

  it('blocks SSN / national ID fields', () => {
    const res = evaluateFieldSensitivity({ name: 'ssn_number', label: 'Social Security Number' });
    expect(res.isBlocked).toBe(true);
    expect(res.category).toBe('government_id');
  });

  it('blocks payment card numbers', () => {
    const res = evaluateFieldSensitivity({ placeholder: 'Credit Card Number', name: 'card_num' });
    expect(res.isBlocked).toBe(true);
    expect(res.category).toBe('payment_card');
  });

  it('blocks legal declarations and certification checkboxes', () => {
    const res = evaluateFieldSensitivity({
      label: 'I declare under penalty of perjury that the info is correct',
    });
    expect(res.isBlocked).toBe(true);
    expect(res.category).toBe('certification');
  });

  it('blocks demographic fields from safe autofill', () => {
    const res = evaluateFieldSensitivity({ label: 'What is your race / ethnicity?' });
    expect(res.isBlocked).toBe(true);
    expect(res.category).toBe('demographic_race');
  });

  it('permits safe ordinary fields', () => {
    const res = evaluateFieldSensitivity({
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      autocomplete: 'given-name',
    });
    expect(res.isBlocked).toBe(false);
    expect(res.category).toBeNull();
  });
});
