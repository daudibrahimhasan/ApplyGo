import { describe, it, expect } from 'vitest';
import { matchFieldToProfile } from '../../src/core/matching/matcher';
import { DetectedField } from '../../src/shared/schemas/fields';
import { defaultProfile } from '../../src/shared/storage/defaultProfile';

function createMockField(overrides: Partial<DetectedField> = {}): DetectedField {
  return {
    id: 'f1',
    selector: '#test',
    inputType: 'text',
    label: '',
    placeholder: '',
    name: '',
    domId: '',
    ariaLabel: '',
    ariaDescription: '',
    nearbyInstructions: '',
    sectionHeading: '',
    options: [],
    required: false,
    currentValue: '',
    visibility: true,
    disabled: false,
    sensitivity: 'safe',
    confidence: 'low',
    fillState: 'unfilled',
    ...overrides,
  };
}

describe('matcher', () => {
  it('matches first name with high confidence', () => {
    const field = createMockField({ label: 'First Name', name: 'firstName' });
    const match = matchFieldToProfile(field, defaultProfile);

    expect(match.confidence).toBe('high');
    expect(match.proposedProfileKey).toBe('personal.firstName');
    expect(match.proposedValue).toBe('Daud');
  });

  it('matches email with high confidence from type and label', () => {
    const field = createMockField({ label: 'Email Address', inputType: 'email' });
    const match = matchFieldToProfile(field, defaultProfile);

    expect(match.confidence).toBe('high');
    expect(match.proposedProfileKey).toBe('personal.email');
    expect(match.proposedValue).toBe('daud.rahman@example.com');
  });

  it('blocks sensitive fields immediately', () => {
    const field = createMockField({ label: 'Social Security Number (SSN)', name: 'ssn' });
    const match = matchFieldToProfile(field, defaultProfile);

    expect(match.confidence).toBe('blocked');
    expect(match.fillState).toBe('blocked');
    expect(match.proposedValue).toBeUndefined();
  });

  it('matches select options with degree normalization', () => {
    const field = createMockField({
      label: 'Degree',
      inputType: 'select',
      options: [
        { label: 'Bachelor of Science', value: 'BS' },
        { label: 'Master of Science', value: 'MS' },
      ],
    });
    const match = matchFieldToProfile(field, defaultProfile);

    expect(match.confidence).toBe('high');
    expect(match.proposedValue).toBe('BS');
  });
});
