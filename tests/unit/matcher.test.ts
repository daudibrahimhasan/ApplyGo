import { describe, it, expect } from 'vitest';
import { matchFieldToProfile } from '../../src/core/matching/matcher';
import { DetectedField } from '../../src/shared/schemas/fields';
import { UserProfile } from '../../src/shared/schemas/profile';

/**
 * Inline test profile — used only within tests.
 * NOT shipped as a default. The real extension starts empty.
 */
const testProfile: UserProfile = {
  id: 'profile_test',
  personal: {
    firstName: 'Alice',
    lastName: 'Smith',
    preferredName: 'Alice',
    pronouns: 'she/her',
    email: 'alice.smith@example.com',
    phone: '+1 (555) 000-1234',
    city: 'Seattle',
    region: 'WA',
    country: 'United States',
    timezone: 'America/Los_Angeles',
  },
  links: {
    other: [],
  },
  education: [
    {
      id: 'edu_test',
      school: 'University of Washington',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      gpa: '3.9',
      startDate: '2020-09',
      endDate: '2024-06',
      current: false,
      achievements: [],
    },
  ],
  employment: [],
  research: [],
  projects: [],
  skills: ['Python', 'TypeScript'],
  awards: [],
  leadership: [],
  authorization: {
    workAuthUS: true,
    requiresSponsorshipUS: false,
    workAuthUK: false,
    requiresSponsorshipUK: true,
    workAuthEU: false,
    requiresSponsorshipEU: true,
    otherCountries: [],
  },
  availability: {
    preferredLocations: ['Seattle, WA'],
    remotePreference: 'any',
    fullTime: true,
  },
  preferences: {
    types: [],
    targetRoles: [],
    areasOfInterest: [],
  },
  resumes: [],
  updatedAt: new Date().toISOString(),
};

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
    const match = matchFieldToProfile(field, testProfile);

    expect(match.confidence).toBe('high');
    expect(match.proposedProfileKey).toBe('personal.firstName');
    expect(match.proposedValue).toBe('Alice');
  });

  it('matches email with high confidence from type and label', () => {
    const field = createMockField({ label: 'Email Address', inputType: 'email' });
    const match = matchFieldToProfile(field, testProfile);

    expect(match.confidence).toBe('high');
    expect(match.proposedProfileKey).toBe('personal.email');
    expect(match.proposedValue).toBe('alice.smith@example.com');
  });

  it('blocks sensitive fields immediately', () => {
    const field = createMockField({ label: 'Social Security Number (SSN)', name: 'ssn' });
    const match = matchFieldToProfile(field, testProfile);

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
    const match = matchFieldToProfile(field, testProfile);

    expect(match.confidence).toBe('high');
    expect(match.proposedValue).toBe('BS');
  });
});
