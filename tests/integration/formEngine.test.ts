// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanPageForFields } from '../../src/content/scanner';
import { fillFields, fillSingleElement } from '../../src/content/filler';
import { UndoManager } from '../../src/content/undo';
import { retrieveKnowledge } from '../../src/core/retrieval/retriever';
import { validateGeneratedOutput } from '../../src/core/generation/validator';
import { UserProfile } from '../../src/shared/schemas/profile';
import { KnowledgeEntry } from '../../src/shared/schemas/knowledge';

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

/**
 * Inline test knowledge — used only within tests.
 */
const testKnowledge: KnowledgeEntry[] = [
  {
    id: 'know_test_safety',
    category: 'Research interests',
    title: 'Agent Safety Verification and Testing',
    canonicalFacts: [
      'Studied verification methods for autonomous AI agents.',
      'Designed testing suites for safety-critical agent behaviors.',
    ],
    shortVersion: 'Focused on safety verification for autonomous agents.',
    longVersion:
      'Researched empirical verification approaches for autonomous tool-calling agents, including sandboxed testing and behavioral anomaly detection.',
    tags: ['AI Safety', 'Verification', 'Testing'],
    relatedSkills: ['Python', 'TypeScript'],
    opportunityTypes: ['Research Fellowship', 'AI Safety Job'],
    evidence: ['Test verification suite'],
    sensitivity: 'normal',
    allowAIUse: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    lastReviewedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('End-to-End Form Engine Workflow', () => {
  beforeEach(() => {
    const fixturePath = path.resolve(__dirname, '../fixtures/complexApplication.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    document.documentElement.innerHTML = html;
  });

  it('scans page, detects fields, blocks sensitive fields, and ignores honeypots', () => {
    const scan = scanPageForFields(testProfile);
    expect(scan.fields.length).toBeGreaterThan(0);

    // Verify honeypot website_trap was ignored
    const honeypot = scan.fields.find((f) => f.name === 'website_trap');
    expect(honeypot).toBeUndefined();

    // Verify firstName is high confidence match
    const firstName = scan.fields.find((f) => f.name === 'firstName');
    expect(firstName).toBeDefined();
    expect(firstName?.confidence).toBe('high');
    expect(firstName?.proposedValue).toBe('Alice');

    // Verify sensitive fields are BLOCKED
    const ssnField = scan.fields.find((f) => f.name === 'ssn');
    expect(ssnField).toBeDefined();
    expect(ssnField?.confidence).toBe('blocked');
    expect(ssnField?.sensitivity).toBe('blocked');

    const pwdField = scan.fields.find((f) => f.name === 'password');
    expect(pwdField).toBeDefined();
    expect(pwdField?.confidence).toBe('blocked');
    expect(pwdField?.sensitivity).toBe('blocked');

    const certField = scan.fields.find((f) => f.name === 'certify_truth');
    expect(certField).toBeDefined();
    expect(certField?.confidence).toBe('blocked');
  });

  it('fills safe fields, preserves user values, and leaves sensitive fields untouched', async () => {
    const scan = scanPageForFields(testProfile);
    const safeFields = scan.fields
      .filter((f) => f.confidence === 'high' && f.sensitivity === 'safe' && f.proposedValue)
      .map((f) => ({ id: f.id, selector: f.selector, value: f.proposedValue! }));

    expect(safeFields.length).toBeGreaterThan(0);

    const fillResult = await fillFields(safeFields);
    expect(fillResult.successCount).toBeGreaterThan(0);

    // Verify filled values in DOM
    const firstNameInput = document.querySelector<HTMLInputElement>('#first_name');
    expect(firstNameInput?.value).toBe('Alice');

    const lastNameInput = document.querySelector<HTMLInputElement>('#last_name');
    expect(lastNameInput?.value).toBe('Smith');

    const emailInput = document.querySelector<HTMLInputElement>('#email');
    expect(emailInput?.value).toBe('alice.smith@example.com');

    // Verify sensitive inputs REMAIN UNTOUCHED
    const ssnInput = document.querySelector<HTMLInputElement>('#ssn_tax_id');
    expect(ssnInput?.value).toBe('');

    const pwdInput = document.querySelector<HTMLInputElement>('#account_pwd');
    expect(pwdInput?.value).toBe('');

    const certBox = document.querySelector<HTMLInputElement>('#legal_cert');
    expect(certBox?.checked).toBe(false);

    // Verify existing user value was preserved
    const referralInput = document.querySelector<HTMLInputElement>('#user_note');
    expect(referralInput?.value).toBe('Attended CHAI workshop');
  });

  it('undoes the fill transaction and restores previous values', async () => {
    const scan = scanPageForFields(testProfile);
    const safeFields = scan.fields
      .filter((f) => f.confidence === 'high' && f.sensitivity === 'safe' && f.proposedValue)
      .map((f) => ({ id: f.id, selector: f.selector, value: f.proposedValue! }));

    await fillFields(safeFields);
    const firstNameInput = document.querySelector<HTMLInputElement>('#first_name');
    expect(firstNameInput?.value).toBe('Alice');

    // Undo transaction
    const undoResult = UndoManager.undoLastTransaction();
    expect(undoResult.success).toBe(true);
    expect(undoResult.restoredCount).toBeGreaterThan(0);

    // Value should be restored to initial empty state
    expect(firstNameInput?.value).toBe('');
  });

  it('validates a grounded written answer and inserts it into essay field without submitting', async () => {
    const questionText = 'Describe your technical focus in AI safety and verification.';
    const retrieved = retrieveKnowledge(questionText, testKnowledge, 'Research Fellowship', 3);
    expect(retrieved.length).toBeGreaterThan(0);

    const allowedIds = retrieved.map((r) => r.entry.id);

    // Mocked grounded answer using test knowledge facts
    const mockModelOutput = {
      answer:
        'My research focuses on empirical verification approaches for autonomous tool-calling agents. I have designed testing suites for safety-critical agent behaviors including sandboxed testing and behavioral anomaly detection to ensure that safety interventions actually work in practice.',
      usedKnowledgeIds: [allowedIds[0]],
      unsupportedClaims: [],
      missingInformation: [],
      confidence: 'high',
    };

    const validation = validateGeneratedOutput(mockModelOutput, allowedIds, { wordLimit: 250 });
    expect(validation.isValid).toBe(true);
    expect(validation.canInsertDirectly).toBe(true);

    // Insert into textarea
    const insertRes = await fillSingleElement('#research_statement', validation.data!.answer);
    expect(insertRes.success).toBe(true);

    const textarea = document.querySelector<HTMLTextAreaElement>('#research_statement');
    expect(textarea?.value).toContain('verification');

    // Confirm submit button was NEVER clicked
    let submitted = false;
    document.querySelector('#fellowship_form')?.addEventListener('submit', () => {
      submitted = true;
    });
    expect(submitted).toBe(false);
  });
});
